import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';

@Injectable()
export class BolnaService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.BOLNA_API_BASE_URL || 'https://api.bolna.ai',
      headers: {
        'Content-Type': 'application/json',
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    this.api.interceptors.request.use((config) => {
      config.headers['Authorization'] = `Bearer ${process.env.BOLNA_API_KEY}`;
      return config;
    });
  }

  async getAgents() {
    const res = await this.api.get('/v2/agent/all');
    return res.data;
  }

  async triggerCall(phoneNumber: string, agentId: string, customerId: any, callData: any) {
    const res = await this.api.post('/call', {
      agent_id: agentId,
      recipient_phone_number: phoneNumber,
      user_data: {
        customer_id: String(customerId),
        customer_name: callData.customerName,
        call_purpose: callData.purpose || 'customer_outreach',
        language: callData.language || 'en',
      },
      webhook_url: process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/bolna',
    });
    return res.data;
  }

  async getExecution(executionId: string) {
    const res = await this.api.get(`/executions/${executionId}`);
    return res.data;
  }

  async getAgentExecutions(agentId: string, pageSize = 200) {
    const res = await this.api.get(`/agent/${agentId}/executions`, { params: { page_size: pageSize } });
    const d = res.data;
    return Array.isArray(d) ? d : (d.data || d.executions || d.results || []);
  }

  async getBatch(batchId: string) {
    const res = await this.api.get(`/batches/${batchId}`);
    return res.data;
  }

  async getBatchExecutions(batchId: string) {
    const res = await this.api.get(`/batches/${batchId}/executions`);
    return res.data;
  }

  async stopBatch(batchId: string) {
    const res = await this.api.post(`/batches/${batchId}/stop`);
    return res.data;
  }

  async scheduleBatch(batchId: string, scheduledAt?: string) {
    // Use native fetch to avoid axios multipart header bleed from createBatch
    const at = scheduledAt || new Date().toISOString();
    const baseUrl = process.env.BOLNA_API_BASE_URL || 'https://api.bolna.ai';
    const apiKey = process.env.BOLNA_API_KEY;
    const response = await fetch(`${baseUrl}/batches/${batchId}/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ scheduled_at: at }),
    });
    return response.json();
  }

  async createBatch(formData: any, headers: any) {
    const res = await this.api.post('/batches', formData, { headers });
    return res.data;
  }
}
