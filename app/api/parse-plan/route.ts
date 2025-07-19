import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as XLSX from 'xlsx';

const PLAN_FILES: { [key: string]: string } = {
  'Ingeniería Informática': 'Plan_Ing_Informática_2023.json',
  'Ingeniería Industrial': 'Plan_Ing_Industrial_2025.json',
  'Licenciatura en Ciencia de Datos': 'Plan_Ciencia_de_Datos_2025.json',
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    const planName: string | null = data.get('planName') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.xls') && !file.name.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'File must be an Excel file (.xls or .xlsx)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    
    // Parse Excel file using xlsx library
    const workbook = XLSX.read(bytes, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Extract student name and courses from Excel data (matching Python script logic)
    let studentName = '';
    const extractedCourses: any[] = [];
    let currentModule = null;
    let isCoreModule = false;

    // Helper function to detect student name
    const detectStudentName = (row: any[]) => {
      for (const cell of row) {
        const cellStr = String(cell || '');
        if (cellStr.includes('Alumno:')) {
          return cellStr.includes(':') ? cellStr.split(':', 2)[1].trim() : '';
        }
      }
      return '';
    };

    // Helper function to parse subject status (matching Python logic)
    const parseSubjectStatus = (notaStr: string, origenStr: string) => {
      const nota = (notaStr || '').trim();
      const origen = (origenStr || '').trim();
      const notaLower = nota.toLowerCase();
      const origenLower = origen.toLowerCase();

      // Check if it's "En Curso"
      if (notaLower.includes('en curso') || origenLower.includes('en curso')) {
        return { status: 'CURSANDO', grade: null };
      }

      // Check if origin is "Regularidad" -> EN_FINAL
      if (origenLower.includes('regularidad')) {
        return { status: 'EN_FINAL', grade: null };
      }

      // Check if it's approved
      if (notaLower.includes('aprobado') || notaLower.includes('promocionado')) {
        const gradeMatch = nota.match(/(\d+(?:\.\d+)?)/);
        const grade = gradeMatch ? parseFloat(gradeMatch[1]) : null;
        return { status: 'APROBADA', grade };
      }

      // Check for failed
      if (notaLower.includes('desaprobada') || notaLower.includes('desaprobado')) {
        return { status: 'DESAPROBADA', grade: null };
      }

      // Default case
      return { status: 'DISPONIBLE', grade: null };
    };

    // Helper function to check if module is core curriculum
    const isCoreModule_ = (moduleHeader: string) => {
      if (!moduleHeader) return false;
      const moduleUpper = moduleHeader.toUpperCase();
      const yearPatterns = ['1ER. AÑO', '2DO. AÑO', '3ER. AÑO', '4TO. AÑO', '5TO. AÑO'];
      return yearPatterns.some(pattern => moduleUpper.includes(pattern));
    };

    // Helper function to calculate semester
    const calculateSemester = (year: string, period: string) => {
      if (!period || period.toUpperCase() === 'ANUAL') {
        return null;
      }
      if (period.includes('1C')) return 1;
      if (period.includes('2C')) return 2;
      return 1; // Default
    };

    // Process Excel data row by row (matching Python script logic)
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      const cells = row.map(cell => String(cell || '').trim());

      // Try to extract student name
      if (!studentName) {
        const foundName = detectStudentName(row);
        if (foundName) {
          studentName = foundName;
          continue;
        }
      }

      // Check if this is a module header
      if (cells.length > 0 && cells[0].toUpperCase().includes('MÓDULO:')) {
        currentModule = cells[0];
        isCoreModule = isCoreModule_(currentModule);
        continue;
      }

      // Check if this is a header row (contains "Actividad")
      if (cells.length > 0 && cells[0].includes('Actividad')) {
        continue;
      }

      // Skip if not in any module or empty row
      if (!currentModule || cells.length === 0) {
        continue;
      }

      const actividad = cells[0];
      if (!actividad || actividad === 'nan') {
        continue;
      }

      // Extract course name and ID using regex (matching Python logic)
      const courseMatch = actividad.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (!courseMatch) {
        continue;
      }

      const courseName = courseMatch[1].trim();
      const courseId = courseMatch[2].trim();

      // Extract other fields (matching Python script columns)
      const tipo = cells[1] || '';
      const year = cells[2] || '';
      const period = cells[3] || '';
      const nota = cells[4] || '';
      const origen = cells[5] || '';
      const credits = cells[6] || '0.00';

      // Only process core curriculum subjects
      if (!isCoreModule) {
        continue;
      }

      // Parse status and grade
      const { status, grade } = parseSubjectStatus(nota, origen);

      // Calculate semester
      const semester = calculateSemester(year, period);

      const courseData = {
        Course: courseName,
        ID: courseId,
        Year: year && !isNaN(parseInt(year)) ? parseInt(year) : 1,
        Semester: semester,
        Credits: credits && credits !== 'nan' ? credits : '0.00',
        status: status,
        ...(grade !== null && { grade })
      };

      extractedCourses.push(courseData);
    }

    const templateFileName = planName ? PLAN_FILES[planName] : null;

    // Load the template plan data (with all prerequisites intact)
    let templateCourses = [];
    if (templateFileName) {
      try {
        const templatePlanPath = join(process.cwd(), 'docs', 'planes_json', templateFileName);
        const templateData = await readFile(templatePlanPath, 'utf-8');
        templateCourses = JSON.parse(templateData);
      } catch (e) {
        console.error(`Could not load template plan for ${planName}:`, e);
        // Continue without a template if the file is not found or invalid
      }
    }
    
    // Use template as base and only update status/grades from Excel
    if (templateCourses.length > 0) {
      const mergedCourses = templateCourses.map((templateCourse: any) => {
        const uploadedCourse = extractedCourses.find((c: any) => c.ID === templateCourse.ID);
        
        // Electives are not in student Excel files, so we keep the template version
        if (templateCourse.Year === 'Electives') {
          return templateCourse;
        }

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
      return NextResponse.json({ 
        success: true, 
        data: mergedCourses,
        studentName: studentName || undefined,
        message: 'File processed successfully'
      });
    } else {
      // If no template is found (e.g., planName not provided or file missing),
      // return only the extracted courses. This might lack prerequisite data.
      return NextResponse.json({ 
        success: true, 
        data: extractedCourses,
        studentName: studentName || undefined,
        message: 'File processed without a curriculum template'
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 