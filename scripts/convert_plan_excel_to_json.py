#!/usr/bin/env python3
"""
Lee un archivo Excel de planes y genera, para cada hoja, un JSON con la estructura de plan.json:
- Course: nombre de la materia
- ID: código numérico del Excel (columna 'Cód.')
- Year: año actual (según encabezados "1er Año", "2do Año", ...)
- Semester: cuatrimestre actual (según encabezados "1er Cuatrimestre", "2do Cuatrimestre")
- Credits: créditos como string con dos decimales
- Prerequisites to Take: lista de correlativas como '(ID, Regularizada)', separadas por coma, o null
- Prerequisites to Pass: mismas correlativas como '(ID, Aprobada)', o null
- Prerequisite to Take for: materias que dependen de esta como '(ID, Aprobada)', o null
- Prerequisite to Pass for: igual a Take for
Requiere pandas y openpyxl: pip install pandas openpyxl
"""
import pandas as pd
import json
import os
import re


def parse_ordinal_to_int(s):
    text = str(s)
    # Primero intentar dígitos
    m = re.match(r'(\d+)', text)
    if m:
        return int(m.group(1))
    # Mapeo de ordinales en español
    low = text.lower()
    ord_map = {
        'primer': 1, 'primero': 1,
        'segundo': 2, 'tercer': 3, 'tercero': 3,
        'cuarto': 4,
        'quinto': 5,
        'sexto': 6,
        'séptimo': 7, 'septimo': 7,
        'octavo': 8,
        'noveno': 9,
        'décimo': 10, 'decimo': 10
    }
    for word, num in ord_map.items():
        if word in low:
            return num
    return None


def main():
    input_file = os.path.join('docs', 'planes_pdf', 'planes_parseados.xlsx')
    output_dir = os.path.join('docs', 'planes_json')
    os.makedirs(output_dir, exist_ok=True)
    xls = pd.ExcelFile(input_file, engine='openpyxl')

    for sheet in xls.sheet_names:
        print(f"Procesando hoja: {sheet}")
        # Cargar hoja y determinar fila de encabezado
        df = xls.parse(sheet, header=0)
        # Si la hoja no tiene la columna 'Cód.', cargar con header=1 (saltando título)
        if 'Cód.' not in df.columns:
            df = xls.parse(sheet, header=1)
        # Detectar nombres de columnas dinámicamente
        cols = df.columns.tolist()
        code_col = next((c for c in cols if re.match(r'^C[oó]d', c)), None)
        course_col = next((c for c in cols if re.match(r'^(Materi|Asigna)', c, re.I)), None)
        correlatives_col = next((c for c in cols if re.search(r'Correl', c, re.I)), None)
        credits_col = next((c for c in cols if re.search(r'Cr[eé]dit', c, re.I)), None)
        # Detectar columna de semestre (Sem. o Semestre)
        semester_col = next((c for c in cols if re.match(r'^(Sem(estr)?\.?|Sem\.)', c, re.I)), None)
        if not code_col or not course_col or not correlatives_col or not credits_col or not semester_col:
            print(f"Columnas no encontradas en hoja {sheet}:", cols)
            continue
        current_year = None
        current_semester = None
        subjects = []
        prereq_map = {}

        for _, row in df.iterrows():
            code = row.get(code_col)
            course = row.get(course_col)
            correlatives = row.get(correlatives_col)
            # Detect encabezados de Año
            if pd.isna(course) and isinstance(code, str) and 'año' in code.lower():
                current_year = parse_ordinal_to_int(code)
                continue
            # Detect encabezados de Cuatrimestre
            if pd.isna(course) and isinstance(code, str) and 'cuatrimestre' in code.lower():
                current_semester = parse_ordinal_to_int(code)
                continue
            # Saltar totales y filas inválidas
            if pd.isna(code) or pd.isna(course) or str(course).strip().lower() == 'total':
                continue
            # Prepara ID y créditos
            id_str = str(int(code))
            cred_raw = row.get(credits_col)
            try:
                cred_val = float(cred_raw)
                cred_str = f"{cred_val:.2f}"
            except:
                cred_str = None
            # Parsear correlativas
            if pd.isna(correlatives) or str(correlatives).strip() in ['-','']:
                prereqs = []
            else:
                prereqs = [p.strip() for p in str(correlatives).split(';') if p.strip()]
            prereq_map[id_str] = prereqs
            # Guardar información básica de la materia y la raw_sem de la fila
            raw_sem = row.get(semester_col)
            subjects.append({
                'Course': course,
                'ID': id_str,
                'Year': current_year,
                'raw_sem': raw_sem,
                'Credits': cred_str,
            })

        # Mapa inverso de correlativas
        reverse_map = {s['ID']: [] for s in subjects}
        for sid, prereqs in prereq_map.items():
            for p in prereqs:
                if p in reverse_map:
                    reverse_map[p].append(sid)

        # Construir lista final
        final = []
        for subj in subjects:
            sid = subj['ID']
            # Prerequisites to Take / Pass
            take = prereq_map.get(sid, [])
            take_str = None if not take else ', '.join(f"({p}, Regularizada)" for p in take)
            pass_str = None if not take else ', '.join(f"({p}, Aprobada)" for p in take)
            # Dependientes directos (hijos)
            children = reverse_map.get(sid, [])
            # Dependientes a nivel 2 (nietos)
            grandchildren = []
            for c in children:
                grandchildren.extend(reverse_map.get(c, []))
            # Eliminar duplicados y directos
            grandchildren = list(set(grandchildren) - set(children))
            # Prerequisite to Take for: hijos=Regularizada, nietos=Aprobada
            entries = [f"({c}, Regularizada)" for c in children]
            entries += [f"({g}, Aprobada)" for g in grandchildren]
            take_for_str = None if not entries else ', '.join(entries)
            # Prerequisite to Pass for: hijos y nietos como Aprobada
            pass_entries = [f"({c}, Aprobada)" for c in children] + [f"({g}, Aprobada)" for g in grandchildren]
            pass_for_str = None if not pass_entries else ', '.join(pass_entries)
            # Detectar semester específico de la fila si existe
            raw_sem = subj['raw_sem']
            if pd.notna(raw_sem) and isinstance(raw_sem, str):
                sem_val = parse_ordinal_to_int(raw_sem)
            else:
                sem_val = current_semester
            # Añadir al JSON final
            final.append({
                'Course': subj['Course'],
                'ID': subj['ID'],
                'Year': subj['Year'],
                'Semester': sem_val,
                'Credits': subj['Credits'],
                'Prerequisites to Take': take_str,
                'Prerequisites to Pass': pass_str,
                'Prerequisite to Take for': take_for_str,
                'Prerequisite to Pass for': pass_for_str,
            })

        safe = sheet.replace(' ', '_')
        out = os.path.join(output_dir, f"{safe}.json")
        with open(out, 'w', encoding='utf-8') as f:
            json.dump(final, f, ensure_ascii=False, indent=2)
        print(f"Generado: {out}")


if __name__ == '__main__':
    main() 