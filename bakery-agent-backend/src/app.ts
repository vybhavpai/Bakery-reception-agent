import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { InventoryService } from './services/inventory.service';
import { SalesmanService } from './services/salesman.service';
import { BolnaService } from './services/bolna.service';
import { OrderService } from './services/order.service';
import { OrderUpdateRequestService } from './services/order-update-request.service';
import { CallLogService } from './services/call-log.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize services
const inventoryService = new InventoryService();
const salesmanService = new SalesmanService();
const bolnaService = new BolnaService();
const orderService = new OrderService();
const orderUpdateRequestService = new OrderUpdateRequestService();
const callLogService = new CallLogService();

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

// Phase 1 & 2: GET /api/inventory - returns all items OR specific items by item_name/item_id query params
app.get('/api/inventory', async (req: Request, res: Response) => {
  try {
    const { item_name, item_id, item_ids } = req.query;

    // If no filters provided, return all items (Phase 1 behavior)
    if (!item_name && !item_id && !item_ids) {
      const items = await inventoryService.getAllItems();
      return res.json(items);
    }

    // Handle multiple item_ids (comma-separated or array)
    if (item_ids) {
      const idsArray = Array.isArray(item_ids) 
        ? item_ids as string[]
        : typeof item_ids === 'string' 
          ? item_ids.split(',').map(id => id.trim())
          : [];
      
      if (idsArray.length > 0) {
        const items = await inventoryService.getItemsByIds(idsArray);
        return res.json(items);
      }
    }

    // Handle single item_id
    if (item_id && typeof item_id === 'string') {
      const item = await inventoryService.getItemById(item_id);
      if (!item) {
        return res.status(404).json({ error: 'Item not found', item_id });
      }
      return res.json(item);
    }

    // Handle item_name(s) - can be comma-separated or single
    if (item_name) {
      if (typeof item_name === 'string') {
        // Check if it's comma-separated multiple names
        const namesArray = item_name.includes(',') 
          ? item_name.split(',').map(name => name.trim())
          : [item_name];
        
        if (namesArray.length > 1) {
          // Multiple names - bulk fetch
          const items = await inventoryService.getItemsByNames(namesArray);
          return res.json(items);
        } else {
          // Single name
          const item = await inventoryService.getItemByName(namesArray[0]);
          if (!item) {
            return res.status(404).json({ error: 'Item not found', item_name: namesArray[0] });
          }
          return res.json(item);
        }
      }
    }

    // Fallback: return all items if query params are invalid
    const items = await inventoryService.getAllItems();
    return res.json(items);
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

// GET /api/orders - get orders with filtering, sorting, and pagination
app.get('/api/orders', async (req: Request, res: Response) => {
  try {
    const { salesman_id, salesman_ids, sort_by, order, page, count } = req.query;

    // Parse salesman IDs (support both single and multiple)
    let salesmanIds: string[] | undefined;
    if (salesman_ids) {
      // Multiple salesman IDs (comma-separated or array)
      salesmanIds = Array.isArray(salesman_ids)
        ? salesman_ids as string[]
        : typeof salesman_ids === 'string'
          ? salesman_ids.split(',').map(id => id.trim()).filter(id => id.length > 0)
          : [];
    } else if (salesman_id) {
      // Single salesman ID (backward compatibility)
      salesmanIds = [salesman_id as string];
    }

    // Parse pagination (defaults: page=1, count=20)
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const countNum = count ? parseInt(count as string, 10) : 20;

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Invalid page number. Must be a positive integer.' });
    }

    if (isNaN(countNum) || countNum < 1 || countNum > 100) {
      return res.status(400).json({ error: 'Invalid count. Must be between 1 and 100.' });
    }

    // Parse sorting (default: sort_by=created_at, order=desc)
    const sortBy = (sort_by as string) || 'created_at';
    const sortOrder = (order === 'asc' || order === 'desc') ? order : 'desc';

    // Get orders with filters
    const result = await orderService.getOrdersWithFilters({
      salesmanIds,
      sortBy,
      sortOrder,
      page: pageNum,
      count: countNum,
    });

    res.json({
      data: result.data,
      pagination: {
        page: result.page,
        count: result.count,
        total: result.total,
        total_pages: Math.ceil(result.total / countNum),
      },
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    
    // Check if it's a validation error (invalid sort column)
    if (errorMessage.includes('Invalid sort column')) {
      return res.status(400).json({ error: errorMessage });
    }

    res.status(500).json({ error: 'Failed to fetch orders', details: errorMessage });
  }
});

// GET /api/orders/:id - get order details with items and units
app.get('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const orderWithItems = await orderService.getOrderWithItems(id);

    if (!orderWithItems) {
      return res.status(404).json({
        error: 'Order not found',
        details: `No order found with id: ${id}`,
      });
    }

    // Fetch inventory items to get units
    const itemIds = orderWithItems.items.map(item => item.item_id);
    const inventoryItems = await inventoryService.getItemsByIds(itemIds);
    const inventoryMap = new Map(inventoryItems.map(item => [item.item_id, item]));

    // Enhance items with unit information
    const itemsWithUnits = orderWithItems.items.map(item => {
      const inventoryItem = inventoryMap.get(item.item_id);
      return {
        ...item,
        unit: inventoryItem?.unit || 'units',
      };
    });

    return res.json({
      ...orderWithItems.order,
      items: itemsWithUnits,
    });
  } catch (err) {
    console.error('Error fetching order details:', err);
    return res.status(500).json({
      error: 'Failed to fetch order details',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// Phase 3: POST /api/orders - create order and deduct inventory
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const { salesman_id, items } = req.body;

    if (!salesman_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Invalid payload',
        details: 'salesman_id and non-empty items array are required',
      });
    }

    // Basic shape validation for items
    const invalidItem = items.find(
      (item: any) => !item.item_id || typeof item.quantity !== 'number'
    );
    if (invalidItem) {
      return res.status(400).json({
        error: 'Invalid item payload',
        details: 'Each item must include item_id and numeric quantity',
      });
    }

    try {
      // Map incoming items into OrderItemCreate shape
      const orderItems = items.map((item: any) => ({
        // order_id will be set inside OrderService
        order_id: '', // placeholder, ignored by service when setting real order_id
        item_id: item.item_id,
        item_name: '', // will be populated from inventory in OrderItemService
        quantity: item.quantity,
      }));

      const order = await orderService.createOrder(
        { salesman_id },
        orderItems as any
      );

      return res.status(201).json(order);
    } catch (err) {
      // Handle structured insufficient stock errors thrown by OrderItemService
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed?.type === 'INSUFFICIENT_STOCK') {
            return res.status(400).json({
              error: 'INSUFFICIENT_STOCK',
              items: parsed.items,
            });
          }
        } catch {
          // fall through to generic error
        }
      }

      throw err;
    }
  } catch (err) {
    console.error('Error creating order:', err);
    return res.status(500).json({
      error: 'Failed to create order',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// Phase 6: Order Update Requests
// POST /api/order-update-requests - create update request (single item change)
app.post('/api/order-update-requests', async (req: Request, res: Response) => {
  try {
    console.log("received order update request with body:", req.body);
    const { order_id, salesman_id, item_name, delta } = req.body;

    if (!order_id || !salesman_id || !item_name) {
      return res.status(400).json({
        error: 'Invalid payload',
        details: 'order_id, salesman_id, and item_name are required',
      });
    }

    let parsedDelta: number;
    if (typeof delta === 'number') {
      parsedDelta = delta;
    } else {
      parsedDelta = Number(delta);
      if (isNaN(parsedDelta)) {
        return res.status(400).json({
          error: 'Invalid payload',
          details: 'delta must be a non-zero numeric value',
        });
      }
    }
    if (parsedDelta === 0) {
      return res.status(400).json({
        error: 'Invalid payload',
        details: 'delta must be a non-zero numeric value',
      });
    }

    // Look up item by name
    const inventoryItem = await inventoryService.getItemByName(item_name);
    if (!inventoryItem) {
      return res.status(404).json({
        error: 'Item not found',
        details: `No inventory item found with name: ${item_name}`,
      });
    }
    
    const request = await orderUpdateRequestService.createRequest({
      order_id,
      salesman_id,
      requested_changes: [{
        item_id: inventoryItem.item_id,
        item_name: inventoryItem.item_name,
        delta: parsedDelta,
      }],
    });
    
    return res.status(201).json(request);
  } catch (err) {
    console.error('Error creating update request:', err);
    return res.status(500).json({
      error: 'Failed to create update request',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

// PATCH /api/order-update-requests/:id/approve - approve update request
app.patch('/api/order-update-requests/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const request = await orderUpdateRequestService.approveRequest(id);

    return res.json(request);
  } catch (err) {
    console.error('Error approving update request:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    
    // Check if it's a validation error
    if (errorMessage.includes('not found') || errorMessage.includes('Cannot approve')) {
      return res.status(400).json({ error: errorMessage });
    }

    return res.status(500).json({
      error: 'Failed to approve update request',
      details: errorMessage,
    });
  }
});

// PATCH /api/order-update-requests/:id/reject - reject update request
app.patch('/api/order-update-requests/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Default to 'admin_rejected' if no reason provided
    const rejectionReason = reason || 'admin_rejected';

    if (rejectionReason !== 'inventory_insufficient' && rejectionReason !== 'admin_rejected') {
      return res.status(400).json({
        error: 'Invalid rejection reason',
        details: 'Reason must be either "inventory_insufficient" or "admin_rejected"',
      });
    }

    const request = await orderUpdateRequestService.rejectRequest(id, rejectionReason);

    return res.json(request);
  } catch (err) {
    console.error('Error rejecting update request:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    
    // Check if it's a validation error
    if (errorMessage.includes('not found') || errorMessage.includes('Cannot reject')) {
      return res.status(400).json({ error: errorMessage });
    }

    return res.status(500).json({
      error: 'Failed to reject update request',
      details: errorMessage,
    });
  }
});

// Phase 8: Bolna Webhook
// POST /api/webhook/bolna - receive webhook from Bolna after call ends
app.post('/api/webhook/bolna', async (req: Request, res: Response) => {
  try {
    const { bolna_call_id, salesman_phone, summary, affected_order_ids } = req.body;
    console.log("received webhook from bolna with body:", req.body);

    if (!bolna_call_id) {
      return res.status(400).json({
        error: 'Invalid payload',
        details: 'bolna_call_id is required',
      });
    }

    // Resolve phone to salesman_id
    let salesman;
    if (salesman_phone) {
      salesman = await salesmanService.getSalesmanByPhone(salesman_phone);
      if (!salesman) {
        return res.status(404).json({
          error: 'Salesman not found',
          details: `No salesman found for phone number: ${salesman_phone}`,
        });
      }
    } else {
      return res.status(400).json({
        error: 'Invalid payload',
        details: 'salesman_phone is required',
      });
    }

    // Create call log
    const callLog = await callLogService.createCallLog({
      salesman_id: salesman.salesman_id,
      bolna_call_id,
      summary: summary || undefined,
    });

    // Link call log to orders if provided
    if (affected_order_ids && Array.isArray(affected_order_ids) && affected_order_ids.length > 0) {
      await callLogService.linkCallLogToOrders(callLog.call_log_id, affected_order_ids);
    }

    return res.status(201).json({
      success: true,
      call_log_id: callLog.call_log_id,
      message: 'Call log created successfully',
    });
  } catch (err) {
    console.error('Error processing Bolna webhook:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    
    // Check if it's a duplicate call log
    if (errorMessage.includes('already exists')) {
      return res.status(409).json({
        error: 'Call log already exists',
        details: errorMessage,
      });
    }

    return res.status(500).json({
      error: 'Failed to process webhook',
      details: errorMessage,
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
