#!/usr/bin/env python3
"""
Script para convertir cada hoja de un Excel en un archivo JSON.
Requiere pandas y openpyxl: pip install pandas openpyxl
"""
import pandas as pd
import json
import os


def main():
    # Ruta al archivo de Excel
    input_file = os.path.join('docs', 'planes_pdf', 'planes_parseados.xlsx')
    # Carpeta de salida para los JSON
    output_dir = os.path.join('docs', 'planes_json')
    os.makedirs(output_dir, exist_ok=True)

    # Carga el Excel
    xls = pd.ExcelFile(input_file, engine='openpyxl')

    for sheet_name in xls.sheet_names:
        # Lee la hoja en un DataFrame
        df = xls.parse(sheet_name)
        # Reemplaza NaN por None para JSON
        df = df.where(pd.notnull(df), None)
        # Convierte a lista de dicts
        records = df.to_dict(orient='records')
        # Nombre de salida basado en el nombre de la hoja
        safe_name = sheet_name.replace(' ', '_')
        output_path = os.path.join(output_dir, f'{safe_name}.json')
        # Escribe el JSON indentado
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        print(f'Generado: {output_path}')


if __name__ == '__main__':
    main() 