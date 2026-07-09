import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface ChatProduct {
  id: number;
  name: string;
  price: string;
  image_url: string | null;
}

export interface ChatReply {
  reply: string;
  products: ChatProduct[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  send(messages: { role: 'user' | 'assistant'; content: string }[]) {
    return this.http.post<ChatReply>(`${this.base}/chat`, { messages });
  }
}
