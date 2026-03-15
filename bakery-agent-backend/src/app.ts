import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { InventoryService } from './services/inventory.service';
import { SalesmanService } from './services/salesman.service';
import { BolnaService } from './services/bolna.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize services
const inventoryService = new InventoryService();
const salesmanService = new SalesmanService();
const bolnaService = new BolnaService();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (Phase 0)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Bakery Agent Backend is running' });
});

// GET /api/salesman - returns all salesmen OR specific salesman by phone query param
app.get('/api/salesman', async (req: Request, res: Response) => {
  try {
    const { phone } = req.query;

    if (!phone || typeof phone !== 'string') {
      // If no phone provided, return all salesmen
      const salesmen = await salesmanService.getAllSalesmen();
      return res.json(salesmen);
    }

    // Query specific salesman by phone
    const salesman = await salesmanService.getSalesmanByPhone(phone);

    if (!salesman) {
      return res.status(404).json({ error: 'Salesman not found for phone number', phone });
    }

    res.json(salesman);
  } catch (err) {
    console.error('Error fetching salesman:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: 'Failed to fetch salesman', details: errorMessage });
  }
});

// Phase 1 & 2: GET /api/inventory - returns all items OR specific item by item_name query param
app.get('/api/inventory', async (req: Request, res: Response) => {
  try {
    const { item_name } = req.query;

    if (!item_name || typeof item_name !== 'string') {
      // If no item_name provided, return all items (Phase 1 behavior)
      const items = await inventoryService.getAllItems();
      return res.json(items);
    }

    // Query specific item (case-insensitive match)
    const item = await inventoryService.getItemByName(item_name);

    if (!item) {
      return res.status(404).json({ error: 'Item not found', item_name });
    }

    res.json(item);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: 'Failed to fetch inventory', details: errorMessage });
  }
});

// Phase 2: POST /api/calls/initiate - initiates a Bolna call
app.post('/api/calls/initiate', async (req: Request, res: Response) => {
  try {
    const { salesman_id, salesman_phone } = req.body;

    if (!salesman_id && !salesman_phone) {
      return res.status(400).json({ error: 'Either salesman_id or salesman_phone is required' });
    }

    // Resolve salesman if only phone is provided
    let salesman;
    if (salesman_phone && !salesman_id) {
      salesman = await salesmanService.getSalesmanByPhone(salesman_phone);
      if (!salesman) {
        return res.status(404).json({ error: 'Salesman not found for phone number' });
      }
    } else if (salesman_id) {
      salesman = await salesmanService.getSalesmanById(salesman_id);
      if (!salesman) {
        return res.status(404).json({ error: 'Salesman not found' });
      }
    } else {
      return res.status(400).json({ error: 'Could not resolve salesman' });
    }

    // Get Bolna configuration
    const bolnaApiToken = process.env.BOLNA_API_TOKEN || process.env.BOLNA_API_KEY;
    const bolnaAgentId = process.env.BOLNA_AGENT_ID;

    if (!bolnaApiToken || !bolnaAgentId) {
      return res.status(500).json({ error: 'Bolna configuration missing. Please set BOLNA_API_TOKEN (or BOLNA_API_KEY) and BOLNA_AGENT_ID' });
    }

    // Prepare user_data for Bolna (available in agent prompt)
    const userData = {
      salesman_name: salesman.name,
      salesman_id: salesman.salesman_id,
    };

    // Call Bolna API via service
    const callResult = await bolnaService.initiateCall({
      agentId: bolnaAgentId,
      apiToken: bolnaApiToken,
      recipientPhoneNumber: salesman.phone,
      userData,
    });

    res.json({
      success: callResult.success,
      message: callResult.message,
      status: callResult.status,
      execution_id: callResult.executionId,
      salesman: {
        id: salesman.salesman_id,
        name: salesman.name,
        phone: salesman.phone,
      },
    });
  } catch (err) {
    console.error('Unexpected error initiating call:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
