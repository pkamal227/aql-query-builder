import { Node, Edge } from 'reactflow';

export function generateAQLQuery(nodes: Node[], edges: Edge[]): string {
  if (nodes.length === 0) return '';

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const childrenMap = new Map<string, string>();

  edges.forEach((edge) => {
    childrenMap.set(edge.source, edge.target);
  });

  const rootNodes = nodes.filter(
    (node) => !edges.some((edge) => edge.target === node.id)
  );

  if (rootNodes.length === 0) {
    return nodes
      .map((node) => formatOperator(node.data.operator, node.data.params))
      .filter(Boolean)
      .join('\n| ');
  }

  const orderedNodes: Node[] = [];
  const visited = new Set<string>();

  const traverse = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (node) {
      orderedNodes.push(node);
      const childId = childrenMap.get(nodeId);
      if (childId) {
        traverse(childId);
      }
    }
  };

  rootNodes.forEach((root) => traverse(root.id));

  const queryParts = orderedNodes
    .map((node) => formatOperator(node.data.operator, node.data.params))
    .filter(Boolean);

  return queryParts.join('\n| ');
}

function formatOperator(operator: string, params: Record<string, string>): string {
  const paramValues = Object.values(params).filter(Boolean);

  if (paramValues.length === 0) {
    return operator;
  }

  const mainParam = paramValues[0];

  switch (operator) {
    case 'where':
    case 'cofilter':
      return `${operator} ${mainParam}`;

    case 'calc':
    case 'eval':
      return `${operator} ${mainParam}`;

    case 'fields':
      return `${operator} ${mainParam}`;

    case 'sort':
      return `${operator} ${mainParam}`;

    case 'limit':
    case 'head':
    case 'tail':
      return `${operator} ${mainParam}`;

    case 'rex':
    case 'extract':
    case 'replace':
      return `${operator} ${mainParam}`;

    case 'lookup':
      return `${operator} ${mainParam}`;

    case 'dedup':
      return `${operator} ${mainParam}`;

    case 'top':
    case 'rare':
      return `${operator} ${mainParam}`;

    case 'bin':
      return `${operator} ${mainParam}`;

    case 'fillnull':
      return `${operator} value=${mainParam}`;

    default:
      return `${operator} ${mainParam}`;
  }
}

export function generateMockResults() {
  return [
    {
      event_time: '2024-10-02 14:23:45',
      DeviceName: 'WORKSTATION-01',
      user: 'john.doe',
      file_name: 'setup.exe',
      file_path: 'C:\\Users\\john.doe\\AppData\\Local\\Temp\\setup.exe',
      PreviousFileName: 'installer.tmp',
      PreviousFolderPath: 'C:\\Users\\john.doe\\Downloads',
      parent_command_line: 'C:\\Windows\\explorer.exe',
      InitiatingProcessFileName: 'explorer.exe',
      InitiatingProcessParentFileName: 'userinit.exe',
      file_hash: 'a1b2c3d4e5f6g7h8i9j0'
    },
    {
      event_time: '2024-10-02 13:15:22',
      DeviceName: 'LAPTOP-05',
      user: 'jane.smith',
      file_name: 'update.exe',
      file_path: 'C:\\Users\\jane.smith\\AppData\\Roaming\\update.exe',
      PreviousFileName: 'package.dat',
      PreviousFolderPath: 'C:\\Users\\jane.smith\\Downloads',
      parent_command_line: 'C:\\Windows\\System32\\cmd.exe',
      InitiatingProcessFileName: 'cmd.exe',
      InitiatingProcessParentFileName: 'explorer.exe',
      file_hash: 'b2c3d4e5f6g7h8i9j0k1'
    },
    {
      event_time: '2024-10-02 12:08:11',
      DeviceName: 'DESKTOP-12',
      user: 'bob.wilson',
      file_name: 'installer.exe',
      file_path: 'C:\\Users\\bob.wilson\\Downloads\\installer.exe',
      PreviousFileName: 'download.zip',
      PreviousFolderPath: 'C:\\Users\\bob.wilson\\Downloads',
      parent_command_line: 'C:\\Program Files\\Firefox\\firefox.exe',
      InitiatingProcessFileName: 'firefox.exe',
      InitiatingProcessParentFileName: 'explorer.exe',
      file_hash: 'c3d4e5f6g7h8i9j0k1l2'
    }
  ];
}
