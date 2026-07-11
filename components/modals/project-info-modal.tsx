"use client";

import React from 'react';
import { X } from 'lucide-react';

interface ProjectInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-gray-300">{children}</div>
    </section>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 underline hover:text-blue-300"
    >
      {children}
    </a>
  );
}

export function ProjectInfoModal({ isOpen, onClose }: ProjectInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-700 bg-[#21262d] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-info-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-600 p-6">
          <h2 id="project-info-title" className="text-2xl font-bold text-white">
            Acerca del Proyecto
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
            aria-label="Cerrar acerca del proyecto"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <Section title="¿Qué es Austral Map?">
            <p>
              Austral Map es una herramienta interactiva para visualizar tu plan de estudios,
              correlatividades y progreso académico usando la información que ya existe en SIU
              Guaraní.
            </p>
            <p>
              La idea es simple: importás tu plan una vez, el mapa arma la estructura
              automáticamente y después podés revisar materias disponibles, finales pendientes,
              optativas, otros requisitos y avances manuales sin depender de archivos externos.
            </p>
          </Section>

          <Section title="Cómo importar tu plan desde SIU">
            <ol className="list-decimal space-y-2 pl-5">
              <li>En Austral Map, hacé click en “Importar mi plan”.</li>
              <li>
                Arrastrá el botón “Austral Map — Importar SIU” a tu barra de favoritos. Esto se
                hace una sola vez.
              </li>
              <li>Entrá a SIU Guaraní → Reportes → Plan de estudios.</li>
              <li>Ya estando en esa pantalla, hacé click en el favorito.</li>
              <li>
                Esperá a que termine: el importador carga correlatividades y optativas. Si alguna
                correlativa no carga, aborta para no generar un mapa incompleto.
              </li>
              <li>Cuando termina, volvés automáticamente a Austral Map con tu plan cargado.</li>
            </ol>
            <p className="text-xs text-gray-400">
              Algunos navegadores pueden mostrar un ícono genérico para favoritos javascript. No
              afecta la importación; lo importante es que el favorito se llame bien y funcione.
            </p>
          </Section>

          <Section title="Uso del mapa">
            <ul className="list-disc space-y-2 pl-5">
              <li>Hacé click en una materia para ver detalles y cambiar su estado.</li>
              <li>Hacé doble click en una materia para alternar aprobación manual rápidamente.</li>
              <li>Activá Electivas u Otros Requisitos desde la barra inferior.</li>
              <li>Arrastrá materias verticalmente si necesitás acomodar el mapa.</li>
              <li>Tus cambios manuales se guardan en Local Storage del navegador.</li>
            </ul>
          </Section>

          <Section title="Cómo pasarlo al celular">
            <p>
              El flujo recomendado para teléfono es importar primero el plan en una computadora y
              después usar “Pasar al celular”.
            </p>
            <p>
              Ese botón genera un link privado que incluye tu plan y tus cambios locales: estados,
              notas y posiciones movidas. Al abrirlo en el teléfono, Austral Map carga el mismo
              plan y guarda una copia local en ese navegador.
            </p>
          </Section>

          <Section title="Privacidad">
            <p>
              Austral Map no necesita tu usuario ni contraseña de SIU. El bookmarklet se ejecuta
              localmente en tu navegador, leyendo la página que vos ya tenés abierta.
            </p>
            <p>
              La información importada y tus cambios manuales se guardan en Local Storage. Si
              borrás datos del sitio o cambiás de navegador/dispositivo, vas a tener que importar
              el plan nuevamente.
            </p>
          </Section>

          <Section title="Inspiración">
            <p>
              Este proyecto está inspirado en{' '}
              <ExternalLink href="https://fede.dm/FIUBA-Map/">FIUBA Map</ExternalLink>, creado por
              Fede Del Mazo para la Facultad de Ingeniería de la Universidad de Buenos Aires.
            </p>
          </Section>
        </div>

        <div className="border-t border-gray-600 bg-[#1a1f26] px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
