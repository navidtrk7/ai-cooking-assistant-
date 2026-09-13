import type { Household, PantryItem, RecommendationResponse, AiChatResponse, AiActionDraft } from '../types';


const API_BASE_URL = 'http://localhost:8200/api/v1';

export const api = {
  async getHealth(): Promise<{ status: string; ollama_active: boolean }> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await res.json();
    } catch {
      return { status: 'offline', ollama_active: false };
    }
  },

  async getHousehold(): Promise<Household> {
    const res = await fetch(`${API_BASE_URL}/household`);
    if (!res.ok) throw new Error('خطا در دریافت اطلاعات خانواده');
    return res.json();
  },

  async getPantry(): Promise<PantryItem[]> {
    const res = await fetch(`${API_BASE_URL}/pantry`);
    if (!res.ok) throw new Error('خطا در دریافت موجودی انبار');
    return res.json();
  },

  async addPantryItem(item: { name: string; category: string; quantity: number; unit: string; expiry_days_left: number }): Promise<PantryItem> {
    const res = await fetch(`${API_BASE_URL}/pantry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error('خطا در ثبت کالا در انبار');
    return res.json();
  },

  async deletePantryItem(itemId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/pantry/${itemId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('خطا در حذف کالا');
  },

  async getRecommendations(filters?: any): Promise<RecommendationResponse> {
    const res = await fetch(`${API_BASE_URL}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters || {}),
    });
    if (!res.ok) throw new Error('خطا در دریافت پیشنهادهای هوش مصنوعی');
    return res.json();
  },

  async chatWithAssistant(content: string, context = 'خانه'): Promise<AiChatResponse> {
    const res = await fetch(`${API_BASE_URL}/assistant/chat?context=${encodeURIComponent(context)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', content }),
    });
    if (!res.ok) throw new Error('خطا در گفتگو با دستیار');
    return res.json();
  },

  async confirmAction(draft: AiActionDraft): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/assistant/confirm-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) throw new Error('خطا در ثبت نهایی عملیات');
    return res.json();
  },
};
