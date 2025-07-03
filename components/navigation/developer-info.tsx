import { Github, Linkedin, Mail } from 'lucide-react';

export function DeveloperInfo() {
  return (
    <div className="text-right">
      <div className="text-sm font-medium text-white">Desarrollado por FranCalveyra</div>
      <div className="flex items-center space-x-3 mt-1">
        <a
          href="https://github.com/FranCalveyra"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-xs text-gray-300 hover:text-white transition-colors"
        >
          <Github className="w-4 h-4 mr-1" />
          GitHub
        </a>
        <a
          href="https://www.linkedin.com/in/francisco-calveyra/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-xs text-gray-300 hover:text-blue-400 transition-colors"
        >
          <Linkedin className="w-4 h-4 mr-1" />
          LinkedIn
        </a>
        <a
          href="mailto:franciscocalveyra24@gmail.com"
          className="flex items-center text-xs text-gray-300 hover:text-red-400 transition-colors"
        >
          <Mail className="w-4 h-4 mr-1" />
          Email
        </a>
      </div>
    </div>
  );
} 