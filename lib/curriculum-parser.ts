import { Subject, ParsedPrerequisite, SubjectNode, Connection, SubjectStatus } from '@/types/curriculum';

export function parsePrerequisites(prerequisiteString: string | null): ParsedPrerequisite[] {
  if (!prerequisiteString) return [];
  
  // Parse format: "(ID, Condition), (ID2, Condition2)"
  const regex = /\(([^,]+),\s*([^)]+)\)/g;
  const prerequisites: ParsedPrerequisite[] = [];
  let match;
  
  while ((match = regex.exec(prerequisiteString)) !== null) {
    prerequisites.push({
      id: match[1].trim(),
      condition: match[2].trim() as 'Regularizada' | 'Aprobada'
    });
  }
  
  return prerequisites;
}

export function calculateSubjectStatus(subject: SubjectNode, allNodes: SubjectNode[]): SubjectStatus {
  // If manually set to specific status, keep it
  if (['CURSANDO', 'EN_FINAL', 'DESAPROBADA', 'APROBADA'].includes(subject.status)) {
    return subject.status;
  }

  // Check if all prerequisites are met
  const canTake = subject.prerequisites.every(prereq => {
    const prereqNode = allNodes.find(n => n.ID === prereq.id);
    // If prerequisite is not found in curriculum, assume it's met (like "1", "2", "3", etc.)
    if (!prereqNode) return true;
    
    if (prereq.condition === 'Aprobada') {
      return prereqNode.status === 'APROBADA';
    } else if (prereq.condition === 'Regularizada') {
      return ['CURSANDO', 'EN_FINAL', 'APROBADA'].includes(prereqNode.status);
    }
    return false;
  });

  return canTake ? 'DISPONIBLE' : 'NO_DISPONIBLE';
}

export function calculateAvailableStatus(subject: SubjectNode, allNodes: SubjectNode[]): SubjectStatus {
  // This function calculates ONLY DISPONIBLE/NO_DISPONIBLE based on prerequisites
  // It doesn't preserve existing statuses
  const canTake = subject.prerequisites.every(prereq => {
    const prereqNode = allNodes.find(n => n.ID === prereq.id);
    // If prerequisite is not found in curriculum, assume it's met (like "1", "2", "3", etc.)
    if (!prereqNode) return true;
    
    if (prereq.condition === 'Aprobada') {
      return prereqNode.status === 'APROBADA';
    } else if (prereq.condition === 'Regularizada') {
      return ['CURSANDO', 'EN_FINAL', 'APROBADA'].includes(prereqNode.status);
    }
    return false;
  });

  return canTake ? 'DISPONIBLE' : 'NO_DISPONIBLE';
}

export function calculateLayout(subjects: Subject[]): SubjectNode[] {
  const nodes: SubjectNode[] = [];
  
  // Separate different types of subjects
  const ingressSubjects = subjects.filter(subject => subject.Year === 0);
  const annualSubjects = subjects.filter(subject => typeof subject.Year === 'number' && subject.Year > 0 && subject.Semester === null);
  const coreSubjects = subjects.filter(subject => typeof subject.Year === 'number' && subject.Year > 0 && typeof subject.Semester === 'number');
  
  // Group core subjects by year and semester
  const grouped = coreSubjects.reduce((acc, subject) => {
    const key = `${subject.Year}-${subject.Semester}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(subject);
    return acc;
  }, {} as Record<string, Subject[]>);
  
  // Group annual subjects by year
  const annualGrouped = annualSubjects.reduce((acc, subject) => {
    const key = `${subject.Year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(subject);
    return acc;
  }, {} as Record<string, Subject[]>);
  
  // Calculate positions - organize in columns by semester
  const columnWidth = 250;
  const nodeHeight = 120;
  const startX = 100;
  const startY = 100;
  
  // Process ingress course subjects first (Year 0) - place them in single column before Year 1
  ingressSubjects.forEach((subject, index) => {
    // Place all ingress subjects centered in the single column ingress course area
    const nodeWidth = 180; // Standard node width
    const ingressAreaWidth = columnWidth; // Width of single column header
    const x = startX + (ingressAreaWidth - nodeWidth) / 2; // Center within the single column area
    const y = startY + index * nodeHeight;
    
    const initialStatus = (subject as any).status || 'NO_DISPONIBLE';
    const initialGrade = (subject as any).grade || null;
    
    nodes.push({
      ...subject,
      x,
      y,
      status: initialStatus as SubjectStatus,
      isHighlighted: false,
      isElective: false,
      prerequisites: parsePrerequisites(subject["Prerequisites to Take"]) || 
                    parsePrerequisites(subject["Prerequisites to Pass"]) || [],
      prerequisiteFor: parsePrerequisites(subject["Prerequisite to Take for"]) || 
                      parsePrerequisites(subject["Prerequisite to Pass for"]) || [],
      grade: initialGrade,
    });
  });
  
  // Process regular subjects
  Object.keys(grouped)
    .sort((a, b) => {
      const [yearA, semA] = a.split('-').map(Number);
      const [yearB, semB] = b.split('-').map(Number);
      if (yearA !== yearB) return yearA - yearB;
      return semA - semB;
    })
    .forEach((key, _) => {
      const [year, semester] = key.split('-').map(Number);
      const subjectsInGroup = grouped[key];
      
      // Calculate column position based on semester (add 1 column for ingress course)
      const columnIndex = 1 + (year - 1) * 2 + (semester - 1);
      const x = startX + columnIndex * columnWidth;
      
      subjectsInGroup.forEach((subject, index) => {
        const y = startY + index * nodeHeight;
        
        // Extract initial status and grade from subject if available
        const initialStatus = (subject as any).status || 'NO_DISPONIBLE';
        const initialGrade = (subject as any).grade || null;
        
        nodes.push({
          ...subject,
          x,
          y,
          status: initialStatus as SubjectStatus,
          isHighlighted: false,
          isElective: false,
          prerequisites: parsePrerequisites(subject["Prerequisites to Take"]) || 
                        parsePrerequisites(subject["Prerequisites to Pass"]) || [],
          prerequisiteFor: parsePrerequisites(subject["Prerequisite to Take for"]) || 
                          parsePrerequisites(subject["Prerequisite to Pass for"]) || [],
          grade: initialGrade,
        });
      });
    });
  
  // Process annual subjects
  Object.keys(annualGrouped)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((yearKey) => {
      const year = Number(yearKey);
      const annualSubjectsInYear = annualGrouped[yearKey];
      
      annualSubjectsInYear.forEach((subject, index) => {
        // Calculate the position to span both semesters of the year (add 1 column for ingress course)
        const columnIndex = 1 + (year - 1) * 2; // Start at first semester of the year
        const x = startX + columnIndex * columnWidth;
        
        // Position below regular subjects for this year
        const regularSubjectsCount = Math.max(
          (grouped[`${year}-1`]?.length || 0),
          (grouped[`${year}-2`]?.length || 0)
        );
        const y = startY + (regularSubjectsCount + index) * nodeHeight;
        
        // Extract initial status and grade from subject if available
        const initialStatus = (subject as any).status || 'NO_DISPONIBLE';
        const initialGrade = (subject as any).grade || null;
        
        nodes.push({
          ...subject,
          x,
          y,
          status: initialStatus as SubjectStatus,
          isHighlighted: false,
          isElective: false,
          prerequisites: parsePrerequisites(subject["Prerequisites to Take"]) || 
                        parsePrerequisites(subject["Prerequisites to Pass"]) || [],
          prerequisiteFor: parsePrerequisites(subject["Prerequisite to Take for"]) || 
                          parsePrerequisites(subject["Prerequisite to Pass for"]) || [],
          grade: initialGrade,
        });
      });
    });

  // Process elective subjects as columns to the right of the last semester
  const electiveSubjects = subjects.filter(subject => subject.Year === 'Electives');
  if (electiveSubjects.length > 0) {
    // Determine the last semester column index based on core subjects
    const numericCoreYears = coreSubjects.map(s => Number(s.Year));
    const maxYear = numericCoreYears.length ? Math.max(...numericCoreYears) : 0;
    const baseColumnIndex = 2 * maxYear + 1;
    const numSlotsPerColumn = 6;
    electiveSubjects.forEach((subject, index) => {
      const colOffset = Math.floor(index / numSlotsPerColumn);
      const rowOffset = index % numSlotsPerColumn;
      const columnIndex = baseColumnIndex + colOffset;
      const x = startX + columnIndex * columnWidth;
      const y = startY + rowOffset * nodeHeight;
      const initialStatus = (subject as any).status || 'NO_DISPONIBLE';
      const initialGrade = (subject as any).grade || null;
      nodes.push({
        ...subject,
        x,
        y,
        status: initialStatus as SubjectStatus,
        isHighlighted: false,
        isElective: true,
        prerequisites: parsePrerequisites(subject["Prerequisites to Take"]) || parsePrerequisites(subject["Prerequisites to Pass"]) || [],
        prerequisiteFor: parsePrerequisites(subject["Prerequisite to Take for"]) || parsePrerequisites(subject["Prerequisite to Pass for"]) || [],
        grade: initialGrade,
      });
    });
  }

  // Calculate initial status for all nodes
  // Keep explicit statuses from uploaded data (APROBADA, CURSANDO, etc.)
  // Recalculate DISPONIBLE/NO_DISPONIBLE based on dependencies
  nodes.forEach(node => {
    // If the node doesn't have an explicit status from upload, calculate it
    if (!['APROBADA', 'CURSANDO', 'EN_FINAL', 'DESAPROBADA'].includes(node.status)) {
      node.status = calculateAvailableStatus(node, nodes);
    }
  });
  
  return nodes;
}

export function getConnections(nodes: SubjectNode[]): Connection[] {
  const connections: Connection[] = [];
  
  for (const node of nodes) {
    // For each subject that this node is a prerequisite for
    for (const prereqFor of node.prerequisiteFor) {
      const targetNode = nodes.find(n => n.ID === prereqFor.id);
      if (targetNode) {
        const connection = {
          from: node.ID,
          to: prereqFor.id,
          condition: prereqFor.condition,
          fromStatus: node.status
        };
        connections.push(connection);

      }
    }
  }
  
  return connections;
}