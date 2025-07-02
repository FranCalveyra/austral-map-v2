import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { spawn } from 'child_process';
import { join } from 'path';
import { promises as fs } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'File must be an Excel file (.xls or .xlsx)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save the uploaded file temporarily
    const uploadDir = join(process.cwd(), 'temp');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const tempFilePath = join(uploadDir, 'uploaded_plan.xls');
    const outputFilePath = join(uploadDir, 'plan.json');
    
    await writeFile(tempFilePath, new Uint8Array(buffer));

    // Execute Python script
    const pythonScript = join(process.cwd(), 'parse_plan_estudios.py');
    
    return new Promise((resolve) => {
      const python = spawn('python3', [pythonScript, tempFilePath, '-o', outputFilePath]);
      
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', async (code) => {
        try {
          if (code !== 0) {
            console.error('Python script error:', stderr);
            resolve(NextResponse.json({ 
              error: 'Failed to parse Excel file',
              details: stderr 
            }, { status: 500 }));
            return;
          }

          // Read the generated JSON file
          const jsonData = await fs.readFile(outputFilePath, 'utf-8');
          const parsedData = JSON.parse(jsonData);

          // Extract courses from the uploaded Excel
          const uploadedCourses = parsedData.courses || parsedData;
          
          // Load the template plan data (with all prerequisites intact)
          const templatePlanPath = join(process.cwd(), 'docs', 'plan.json');
          let templateCourses = [];
          try {
            const templateData = await fs.readFile(templatePlanPath, 'utf-8');
            const templatePlan = JSON.parse(templateData);
            // Handle both old format (array) and new format (object with courses)
            templateCourses = Array.isArray(templatePlan) ? templatePlan : templatePlan.courses || [];
          } catch (e) {
            console.error('Could not load template plan data:', e);
            throw new Error('Template plan.json not found or invalid');
          }
          
          // Use template as base and only update status/grades from Excel
          const mergedCourses = templateCourses.map((templateCourse: any) => {
            const uploadedCourse = uploadedCourses.find((c: any) => c.ID === templateCourse.ID);
            
            if (uploadedCourse) {
              // Course found in Excel - update status and grade, keep everything else from template
              return {
                ...templateCourse, // Keep all template data (including prerequisites)
                status: uploadedCourse.status,
                grade: uploadedCourse.grade
              };
            } else {
              // Course not in Excel - keep template data but set status based on type
              // Auto-approve ingress course subjects when Excel is uploaded
              if (templateCourse.Year === 0) {
                return {
                  ...templateCourse,
                  status: 'APROBADA',
                  grade: 10 // Default good grade for ingress courses
                };
              } else {
                return {
                  ...templateCourse,
                  status: 'DISPONIBLE'
                };
              }
            }
          });

          // Clean up temporary files
          await fs.unlink(tempFilePath).catch(() => {});
          await fs.unlink(outputFilePath).catch(() => {});

          resolve(NextResponse.json({ 
            success: true, 
            data: mergedCourses,
            studentName: parsedData.student_name,
            message: 'File processed successfully'
          }));
        } catch (error) {
          console.error('Error processing file:', error);
          resolve(NextResponse.json({ 
            error: 'Failed to process generated JSON',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 }));
        }
      });
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 