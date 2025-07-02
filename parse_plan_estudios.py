#!/usr/bin/env python3
import argparse
import json
import os
import shutil
import subprocess
import re

import pandas as pd

def safe_read_excel(path):
    """
    Try to read .xlsx with openpyxl, or .xls with xlrd.
    If .xls BIFF parsing blows up, use LibreOffice to convert it to .xlsx and retry.
    """
    ext = os.path.splitext(path)[1].lower()
    # if it's already .xlsx, just use openpyxl
    if ext == '.xlsx':
        return pd.read_excel(path, sheet_name=0, header=None, engine='openpyxl', dtype=str)

    # .xls path: first try pandas+xlrd
    try:
        return pd.read_excel(path, sheet_name=0, header=None, engine='xlrd', dtype=str)
    except Exception as e:
        print(f"⚠️  xlrd parse failed: {e!r}")
        # look for LibreOffice CLI
        soffice = shutil.which('soffice') or shutil.which('libreoffice')
        if not soffice:
            raise IOError(
                "Could not parse .xls and LibreOffice CLI not found. "
                "Please install LibreOffice (soffice) or convert the file to .xlsx manually."
            )
        print(f"⏳ Converting to .xlsx via `{soffice}`…")
        outdir = os.path.dirname(path) or '.'
        subprocess.run(
            [soffice, '--headless', '--convert-to', 'xlsx', path, '--outdir', outdir],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        newpath = os.path.splitext(path)[0] + '.xlsx'
        print(f"✅ Converted, now reading {newpath!r}…")
        return pd.read_excel(newpath, sheet_name=0, header=None, engine='openpyxl', dtype=str)


def detect_student_name(df_raw):
    """Extract student name from the Excel file."""
    for i, row in df_raw.iterrows():
        cells = row.fillna('').astype(str).tolist()
        for cell in cells:
            if 'Alumno:' in cell:
                return cell.split(':', 1)[1].strip() if ':' in cell else ''
    return ''


def parse_subject_status(nota_str, origen_str):
    """
    Map Excel status to our system status:
    - (Aprobado) con origen Examen/Promoción -> APROBADA
    - (Promocionado) -> APROBADA  
    - Origen: Regularidad -> EN_FINAL
    - En Curso -> CURSANDO
    - Empty/Missing -> DISPONIBLE (or NO_DISPONIBLE based on prerequisites)
    """
    # Clean the inputs
    nota_str = nota_str.strip() if nota_str and nota_str != 'nan' else ''
    origen_str = origen_str.strip() if origen_str and origen_str != 'nan' else ''
    
    # Convert to lowercase for comparison
    nota_lower = nota_str.lower()
    origen_lower = origen_str.lower()
    
    # Check if it's "En Curso" (can be in either nota or origen)
    if 'en curso' in nota_str or 'en curso' in origen_lower:
        return 'CURSANDO', None
    
    # Check if origin is "Regularidad" -> EN_FINAL
    if 'regularidad' in origen_lower:
        return 'EN_FINAL', None
    
    # Check if it's approved (either by exam or promotion)
    if 'aprobado' in nota_lower or 'promocionado' in nota_lower:
        # Extract grade if present
        grade_match = re.search(r'(\d+(?:\.\d+)?)', nota_str)
        grade = float(grade_match.group(1)) if grade_match else None
        return 'APROBADA', grade
    
    # Check for failed
    if 'desaprobada' in nota_lower or 'desaprobado' in nota_lower:
        return 'DESAPROBADA', None
    
    # Default case - empty or unrecognized
    if not nota_str:
        return 'DISPONIBLE', None
    
    return 'DISPONIBLE', None


def calculate_semester(year, period):
    """
    Calculate semester within the year:
    - 1C = semester 1
    - 2C = semester 2  
    - ANUAL = null (spans both semesters of the year)
    """
    if not period or period.upper() == 'ANUAL':
        return None
    
    if '1C' in period:
        return 1
    elif '2C' in period:
        return 2
    else:
        # Default to first semester if unclear
        return 1


def is_core_curriculum_module(module_header):
    """Check if the module header represents core curriculum (years 1-5)."""
    if not module_header:
        return False
    
    module_upper = module_header.upper()
    
    # Check for year modules (1er, 2do, 3er, 4to, 5to)
    year_patterns = ['1ER. AÑO', '2DO. AÑO', '3ER. AÑO', '4TO. AÑO', '5TO. AÑO']
    for pattern in year_patterns:
        if pattern in module_upper:
            return True
    
    return False


def parse_excel(path):
    """Parse the Excel file and extract course information."""
    df_raw = safe_read_excel(path)
    student_name = detect_student_name(df_raw)
    
    courses = []
    current_module = None
    is_core_module = False
    
    # Find all header rows and process sequentially
    for i, row in df_raw.iterrows():
        cells = row.fillna('').astype(str).tolist()
        
        # Check if this is a module header
        if len(cells) > 0 and 'MÓDULO:' in cells[0].upper():
            current_module = cells[0]
            is_core_module = is_core_curriculum_module(current_module)
            continue
        
        # Check if this is a header row (contains "Actividad")
        if len(cells) > 0 and 'Actividad' in cells[0]:
            continue
        
        # Skip if not in any module or empty row
        if not current_module or len(cells) == 0:
            continue
            
        actividad = cells[0].strip() if len(cells) > 0 else ''
        if not actividad or actividad == 'nan':
            continue
        
        # Extract course name and ID using regex
        course_match = re.search(r'^(.+?)\s*\(([^)]+)\)', actividad)
        if not course_match:
            continue
            
        course_name = course_match.group(1).strip()
        course_id = course_match.group(2).strip()
        
        # Extract other fields
        tipo = cells[1].strip() if len(cells) > 1 else ''
        year = cells[2].strip() if len(cells) > 2 else ''
        period = cells[3].strip() if len(cells) > 3 else ''
        nota = cells[4].strip() if len(cells) > 4 else ''
        origen = cells[5].strip() if len(cells) > 5 else ''
        credits = cells[6].strip() if len(cells) > 6 else '0.00'
        
        # Only process core curriculum subjects (skip optatives and other requirements)
        if not is_core_module:
            continue
        
        # Parse status and grade
        status, grade = parse_subject_status(nota, origen)
        
        # Calculate semester
        semester = calculate_semester(year, period)
        
        course_data = {
            "Course": course_name,
            "ID": course_id,
            "Year": int(year) if year.isdigit() else 1,
            "Semester": semester,
            "Credits": credits if credits and credits != 'nan' else '0.00',
            "Prerequisites to Take": None,
            "Prerequisites to Pass": None,
            "Prerequisite to Take for": None,
            "Prerequisite to Pass for": None,
            "status": status,
            "_debug_nota": nota,
            "_debug_origen": origen
        }
        
        # Add grade if present
        if grade is not None:
            course_data["grade"] = grade
            
        courses.append(course_data)
    
    return student_name, courses


def main():
    parser = argparse.ArgumentParser(description="Parse study-plan Excel into JSON")
    parser.add_argument("excel_file", help=".xls or .xlsx file to parse")
    parser.add_argument("-o","--output", default="output.json", help="JSON output file")
    args = parser.parse_args()

    student_name, courses = parse_excel(args.excel_file)
    out = {"student_name": student_name, "courses": courses}
    
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(courses)} courses for '{student_name}' → {args.output}")


if __name__ == "__main__":
    main()
