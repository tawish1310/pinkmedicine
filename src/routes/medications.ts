import { Router, Request, Response } from 'express';
import { 
  getMedicationsGroupedByGeneric, 
  searchMedicationsGrouped, 
  getGroupedMedicationById,
  GroupedMedication 
} from '../data/medications';
import { PaginatedResponse } from '../types';

const router = Router();

// GET /api/medications - List all medications grouped by generic name
router.get('/', (req: Request, res: Response) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 20;

    const allGrouped = getMedicationsGroupedByGeneric();
    const pagedData = allGrouped.slice(skip, skip + take);

    const response: PaginatedResponse<GroupedMedication> = {
      data: pagedData,
      total: allGrouped.length,
      skip,
      take
    };

    // Static data - cache for 1 day
    res.set('Cache-Control', 'public, max-age=86400');
    res.json(response);
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ error: 'Failed to fetch medications' });
  }
});

// GET /api/medications/search - Search medications by name or other criteria
router.get('/search', (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    const skip = parseInt(req.query.skip as string) || 0;
    const take = parseInt(req.query.take as string) || 20;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const results = searchMedicationsGrouped(q);
    const pagedData = results.slice(skip, skip + take);

    const response: PaginatedResponse<GroupedMedication> = {
      data: pagedData,
      total: results.length,
      skip,
      take
    };

    res.json(response);
  } catch (error) {
    console.error('Error searching medications:', error);
    res.status(500).json({ error: 'Failed to search medications' });
  }
});

// GET /api/medications/:id - Get specific medication with all brand names
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid medication ID' });
    }

    const medication = getGroupedMedicationById(id);

    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    res.json(medication);
  } catch (error) {
    console.error('Error fetching medication:', error);
    res.status(500).json({ error: 'Failed to fetch medication' });
  }
});

export default router;
