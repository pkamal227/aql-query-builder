import { Node, Edge } from 'reactflow';

export const exampleNodes: Node[] = [
  {
    id: '1',
    type: 'operatorNode',
    position: { x: 250, y: 50 },
    data: {
      operator: 'where',
      params: { condition: 'sourcetype = "ms_defender"' }
    }
  },
  {
    id: '2',
    type: 'operatorNode',
    position: { x: 250, y: 150 },
    data: {
      operator: 'where',
      params: { condition: 'category = "AdvancedHunting-DeviceFileEvents"' }
    }
  },
  {
    id: '3',
    type: 'operatorNode',
    position: { x: 250, y: 250 },
    data: {
      operator: 'where',
      params: { condition: "action = 'FileRenamed'" }
    }
  },
  {
    id: '4',
    type: 'operatorNode',
    position: { x: 250, y: 350 },
    data: {
      operator: 'calc',
      params: { expression: 'PreviousFileName = json_extract(message,"properties.PreviousFileName")' }
    }
  },
  {
    id: '5',
    type: 'operatorNode',
    position: { x: 250, y: 450 },
    data: {
      operator: 'calc',
      params: { expression: 'PreviousFolderPath = json_extract(message,"properties.PreviousFolderPath")' }
    }
  },
  {
    id: '6',
    type: 'operatorNode',
    position: { x: 250, y: 550 },
    data: {
      operator: 'calc',
      params: { expression: 'InitiatingProcessFileName = json_extract(message,"properties.InitiatingProcessFileName")' }
    }
  },
  {
    id: '7',
    type: 'operatorNode',
    position: { x: 250, y: 650 },
    data: {
      operator: 'calc',
      params: { expression: 'InitiatingProcessParentFileName = json_extract(message,"properties.InitiatingProcessParentFileName")' }
    }
  },
  {
    id: '8',
    type: 'operatorNode',
    position: { x: 250, y: 750 },
    data: {
      operator: 'where',
      params: { condition: 'file_name endswith ".exe"' }
    }
  },
  {
    id: '9',
    type: 'operatorNode',
    position: { x: 250, y: 850 },
    data: {
      operator: 'where',
      params: { condition: 'PreviousFileName endswith ".tmp" or PreviousFileName endswith ".dat" or PreviousFileName endswith ".zip"' }
    }
  },
  {
    id: '10',
    type: 'operatorNode',
    position: { x: 250, y: 950 },
    data: {
      operator: 'where',
      params: { condition: 'file_path contains_ci ("AppData","Temp","Downloads")' }
    }
  },
  {
    id: '11',
    type: 'operatorNode',
    position: { x: 250, y: 1050 },
    data: {
      operator: 'where',
      params: { condition: 'not InitiatingProcessFileName in ("msiexec.exe","setup.exe","chrome_installer.exe")' }
    }
  },
  {
    id: '12',
    type: 'operatorNode',
    position: { x: 250, y: 1150 },
    data: {
      operator: 'fields',
      params: { fields: 'event_time, src as DeviceName, user, file_name, file_path, PreviousFileName, PreviousFolderPath, parent_command_line, InitiatingProcessFileName, InitiatingProcessParentFileName, file_hash' }
    }
  },
  {
    id: '13',
    type: 'operatorNode',
    position: { x: 250, y: 1250 },
    data: {
      operator: 'sort',
      params: { field: 'event_time desc' }
    }
  }
];

export const exampleEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
  { id: 'e3-4', source: '3', target: '4', animated: true },
  { id: 'e4-5', source: '4', target: '5', animated: true },
  { id: 'e5-6', source: '5', target: '6', animated: true },
  { id: 'e6-7', source: '6', target: '7', animated: true },
  { id: 'e7-8', source: '7', target: '8', animated: true },
  { id: 'e8-9', source: '8', target: '9', animated: true },
  { id: 'e9-10', source: '9', target: '10', animated: true },
  { id: 'e10-11', source: '10', target: '11', animated: true },
  { id: 'e11-12', source: '11', target: '12', animated: true },
  { id: 'e12-13', source: '12', target: '13', animated: true }
];
