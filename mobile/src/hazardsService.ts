import { apiFetch } from './apiService';

export type Hazard = {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  coordinate: {
    latitude: number;
    longitude: number;
  };
};

export async function getHazards(): Promise<Hazard[]> {
  try {
    const data = await apiFetch('/hazards');
    return data.hazards || [];
  } catch {
    return [];
  }
}

export async function addHazard(hazard: Hazard, sessionId?: string): Promise<void> {
  try {
    await apiFetch('/hazards', {
      method: 'POST',
      body: JSON.stringify({
        title: hazard.title,
        description: hazard.description,
        severity: hazard.severity,
        latitude: hazard.coordinate.latitude,
        longitude: hazard.coordinate.longitude,
        sessionId,
      })
    });
  } catch (error) {
    console.error('Failed to add hazard:', error);
  }
}

export async function removeHazard(id: string): Promise<void> {
  // Can be implemented if backend supports DELETE /api/hazards/:id
}
