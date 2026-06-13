export interface GraphNode {
  id: string;
  x: number;
  y: number;
  isExit?: boolean;
  isElevator?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

// Node coordinates matching the floor layout perfectly
export const nodes: GraphNode[] = [
  // Room entrance nodes (doors)
  { id: '1401', x: 90, y: 155 },
  { id: '1402', x: 210, y: 155 },
  { id: '1403', x: 330, y: 155 },
  { id: '1404', x: 450, y: 155 },
  { id: '1405', x: 570, y: 155 },
  { id: '1406', x: 690, y: 155 },
  { id: '1407', x: 90, y: 255 },
  { id: '1408', x: 210, y: 255 },
  { id: '1409', x: 330, y: 255 },
  { id: '1410', x: 450, y: 255 },
  { id: '1411', x: 570, y: 255 },
  { id: '1412', x: 690, y: 255 },

  // Corridor nodes (midline: y=205)
  { id: 'C1', x: 90, y: 205 },
  { id: 'C2', x: 210, y: 205 },
  { id: 'C3', x: 330, y: 205 },
  { id: 'C4', x: 450, y: 205 },
  { id: 'C5', x: 570, y: 205 },
  { id: 'C6', x: 690, y: 205 },

  // Corridor ends
  { id: 'CL', x: 40, y: 205 },
  { id: 'CR', x: 740, y: 205 },

  // Exits
  { id: 'Stairs-L', x: 20, y: 205, isExit: true },
  { id: 'Elev-A', x: 790, y: 95, isExit: true, isElevator: true },
  { id: 'Stairs-T', x: 790, y: 175, isExit: true },
  { id: 'Stairs-B', x: 790, y: 245, isExit: true },
  { id: 'Elev-B', x: 790, y: 315, isExit: true, isElevator: true },
];

// Base edge list
const baseEdges: GraphEdge[] = [
  // Vertical connections: rooms to corridor nodes
  { from: '1401', to: 'C1', weight: 50 },
  { from: 'C1', to: '1401', weight: 50 },
  { from: '1407', to: 'C1', weight: 50 },
  { from: 'C1', to: '1407', weight: 50 },

  { from: '1402', to: 'C2', weight: 50 },
  { from: 'C2', to: '1402', weight: 50 },
  { from: '1408', to: 'C2', weight: 50 },
  { from: 'C2', to: '1408', weight: 50 },

  { from: '1403', to: 'C3', weight: 50 },
  { from: 'C3', to: '1403', weight: 50 },
  { from: '1409', to: 'C3', weight: 50 },
  { from: 'C3', to: '1409', weight: 50 },

  { from: '1404', to: 'C4', weight: 50 },
  { from: 'C4', to: '1404', weight: 50 },
  { from: '1410', to: 'C4', weight: 50 },
  { from: 'C4', to: '1410', weight: 50 },

  { from: '1405', to: 'C5', weight: 50 },
  { from: 'C5', to: '1405', weight: 50 },
  { from: '1411', to: 'C5', weight: 50 },
  { from: 'C5', to: '1411', weight: 50 },

  { from: '1406', to: 'C6', weight: 50 },
  { from: 'C6', to: '1406', weight: 50 },
  { from: '1412', to: 'C6', weight: 50 },
  { from: 'C6', to: '1412', weight: 50 },

  // Horizontal corridor connections
  { from: 'CL', to: 'C1', weight: 50 },
  { from: 'C1', to: 'CL', weight: 50 },

  { from: 'C1', to: 'C2', weight: 120 },
  { from: 'C2', to: 'C1', weight: 120 },

  { from: 'C2', to: 'C3', weight: 120 },
  { from: 'C3', to: 'C2', weight: 120 },

  { from: 'C3', to: 'C4', weight: 120 },
  { from: 'C4', to: 'C3', weight: 120 },

  { from: 'C4', to: 'C5', weight: 120 },
  { from: 'C5', to: 'C4', weight: 120 },

  { from: 'C5', to: 'C6', weight: 120 },
  { from: 'C6', to: 'C5', weight: 120 },

  { from: 'C6', to: 'CR', weight: 50 },
  { from: 'CR', to: 'C6', weight: 50 },

  // Exit connections
  { from: 'CL', to: 'Stairs-L', weight: 20 },
  { from: 'Stairs-L', to: 'CL', weight: 20 },

  { from: 'CR', to: 'Elev-A', weight: 110 },
  { from: 'Elev-A', to: 'CR', weight: 110 },

  { from: 'CR', to: 'Stairs-T', weight: 60 },
  { from: 'Stairs-T', to: 'CR', weight: 60 },

  { from: 'CR', to: 'Stairs-B', weight: 60 },
  { from: 'Stairs-B', to: 'CR', weight: 60 },

  { from: 'CR', to: 'Elev-B', weight: 110 },
  { from: 'Elev-B', to: 'CR', weight: 110 },
];

export interface ActiveIncidentInfo {
  room: string;
  type: string;
  severity: number;
}

/**
 * Computes safe evacuation routes using Dijkstra's algorithm.
 * Applies hazard weights depending on active incident rooms, severity, and type.
 */
export function computeSafePath(
  startRoomId: string,
  activeIncidents: ActiveIncidentInfo[]
): { path: { x: number; y: number }[]; exitId: string } | null {
  // 1. Identify which exits and corridor segments are blocked/penalized
  const blockedNodes = new Set<string>();
  const nodePenalties: Record<string, number> = {};

  const hasFireHazmatWeather = activeIncidents.some(
    (inc) =>
      inc.type === 'fire' ||
      inc.type === 'hazmat' ||
      inc.type === 'weather'
  );

  // If there's fire, hazmat, or severe weather, disable elevators
  if (hasFireHazmatWeather) {
    blockedNodes.add('Elev-A');
    blockedNodes.add('Elev-B');
  }

  for (const inc of activeIncidents) {
    // Block the room entrance node itself
    blockedNodes.add(inc.room);

    // Map room to adjacent corridor node
    let corrNode: string | null = null;
    if (inc.room === '1401' || inc.room === '1407') corrNode = 'C1';
    else if (inc.room === '1402' || inc.room === '1408') corrNode = 'C2';
    else if (inc.room === '1403' || inc.room === '1409') corrNode = 'C3';
    else if (inc.room === '1404' || inc.room === '1410') corrNode = 'C4';
    else if (inc.room === '1405' || inc.room === '1411') corrNode = 'C5';
    else if (inc.room === '1406' || inc.room === '1412') corrNode = 'C6';

    if (corrNode) {
      if (inc.severity >= 3) {
        // High severity incident blocks the corridor segment completely
        blockedNodes.add(corrNode);
      } else {
        // Moderate severity incident penalizes the corridor segment heavily
        nodePenalties[corrNode] = (nodePenalties[corrNode] || 0) + 500;
      }
    }
  }

  // 2. Build graph with adjusted edge weights
  const adjList: Record<string, { to: string; weight: number }[]> = {};
  for (const node of nodes) {
    adjList[node.id] = [];
  }

  for (const edge of baseEdges) {
    // Skip edges connected to blocked nodes
    if (blockedNodes.has(edge.from) || blockedNodes.has(edge.to)) {
      continue;
    }

    let finalWeight = edge.weight;
    // Add node penalties to the edge weight
    if (nodePenalties[edge.from]) {
      finalWeight += nodePenalties[edge.from];
    }
    if (nodePenalties[edge.to]) {
      finalWeight += nodePenalties[edge.to];
    }

    adjList[edge.from].push({ to: edge.to, weight: finalWeight });
  }

  // 3. Run Dijkstra's Algorithm
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  for (const node of nodes) {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    unvisited.add(node.id);
  }

  // Check if start node is valid
  if (!adjList[startRoomId]) return null;
  distances[startRoomId] = 0;

  while (unvisited.size > 0) {
    // Find node with minimum distance
    let minNode: string | null = null;
    let minDist = Infinity;
    for (const node of unvisited) {
      if (distances[node] < minDist) {
        minDist = distances[node];
        minNode = node;
      }
    }

    if (minNode === null || minDist === Infinity) {
      break; // All reachable nodes visited
    }

    unvisited.delete(minNode);

    // If we reached any exit node, we can stop early since all edge weights are positive
    const nodeObj = nodes.find((n) => n.id === minNode);
    if (nodeObj?.isExit) {
      // Reconstruct path
      const pathNodes: string[] = [];
      let curr: string | null = minNode;
      while (curr !== null) {
        pathNodes.unshift(curr);
        curr = previous[curr];
      }

      // Map back to coordinates
      const coords = pathNodes
        .map((id) => {
          const n = nodes.find((node) => node.id === id);
          return n ? { x: n.x, y: n.y } : null;
        })
        .filter((c): c is { x: number; y: number } => c !== null);

      return { path: coords, exitId: minNode };
    }

    // Update neighbors
    for (const edge of adjList[minNode]) {
      if (!unvisited.has(edge.to)) continue;
      const alt = distances[minNode] + edge.weight;
      if (alt < distances[edge.to]) {
        distances[edge.to] = alt;
        previous[edge.to] = minNode;
      }
    }
  }

  return null;
}
