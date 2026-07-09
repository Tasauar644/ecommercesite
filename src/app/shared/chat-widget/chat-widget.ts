import { CurrencyPipe } from '@angular/common';
import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChatProduct, ChatService } from '../../core/services/chat.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  products?: ChatProduct[];
}

const GREETING =
  "Hi! I'm here to help you find something at Dream N Decor. What are you looking for today?\n\nবাংলায়ও লিখতে পারেন — আমি দুই ভাষাতেই সাহায্য করতে পারি।";

@Component({
  selector: 'app-chat-widget',
  imports: [FormsModule, CurrencyPipe, RouterLink],
  template: `
    <div class="fixed bottom-5 right-5 z-40">
      @if (!open()) {
        <button
          (click)="toggle()"
          class="h-14 w-14 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg flex items-center justify-center transition"
          aria-label="Open chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.06 0-2.077-.163-3.02-.465L3 21l1.395-4.184A7.94 7.94 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
          </svg>
        </button>
      } @else {
        <div class="w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl border border-line flex flex-col overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 bg-ink text-white shrink-0">
            <div class="flex items-center gap-2">
              <span class="h-7 w-7 rounded-full bg-brand-600 flex items-center justify-center font-serif font-semibold text-xs shrink-0">DN</span>
              <span class="font-serif font-semibold text-sm">Dream N Decor Assistant</span>
            </div>
            <button (click)="toggle()" aria-label="Close chat" class="text-white/70 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div #scrollArea class="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-cream/40">
            @for (msg of messages(); track $index) {
              <div class="flex" [class]="msg.role === 'user' ? 'justify-end' : 'justify-start'">
                <div
                  class="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap"
                  [class]="msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-white border border-line text-ink'"
                >
                  {{ msg.content }}
                </div>
              </div>
              @if (msg.products && msg.products.length > 0) {
                <div class="flex flex-col gap-2">
                  @for (p of msg.products; track p.id) {
                    <a
                      [routerLink]="['/products', p.id]"
                      (click)="toggle()"
                      class="flex items-center gap-2.5 bg-white border border-line rounded-xl p-2 hover:border-brand-400 transition"
                    >
                      <div class="h-10 w-10 rounded-lg bg-cream overflow-hidden shrink-0 flex items-center justify-center">
                        @if (p.image_url) {
                          <img [src]="p.image_url" [alt]="p.name" class="h-full w-full object-cover" />
                        }
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-semibold text-ink truncate">{{ p.name }}</p>
                        <p class="text-xs text-brand-700 font-bold">{{ p.price | currency:'BDT':'symbol':'1.0-0' }}</p>
                      </div>
                    </a>
                  }
                </div>
              }
            }
            @if (loading()) {
              <div class="flex justify-start">
                <div class="bg-white border border-line rounded-2xl px-3.5 py-2.5 text-sm text-sub">Typing...</div>
              </div>
            }
          </div>

          <form (ngSubmit)="send()" class="flex items-center gap-2 p-3 border-t border-line shrink-0">
            <input
              [(ngModel)]="input"
              name="chatInput"
              placeholder="Ask about a product..."
              autocomplete="off"
              [disabled]="loading()"
              class="flex-1 rounded-full border border-line px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              [disabled]="loading() || !input.trim()"
              class="h-9 w-9 rounded-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white flex items-center justify-center shrink-0 transition"
              aria-label="Send"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.126A59.77 59.77 0 0 1 21.485 12 59.77 59.77 0 0 1 3.269 20.874L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      }
    </div>
  `,
})
export class ChatWidget {
  private chatService = inject(ChatService);
  private scrollArea = viewChild<ElementRef<HTMLDivElement>>('scrollArea');

  open = signal(false);
  loading = signal(false);
  input = '';
  messages = signal<ChatMessage[]>([{ role: 'assistant', content: GREETING }]);

  constructor() {
    effect(() => {
      this.messages();
      this.loading();
      queueMicrotask(() => {
        const el = this.scrollArea()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }

  toggle() {
    this.open.update((o) => !o);
  }

  send() {
    const text = this.input.trim();
    if (!text || this.loading()) return;

    this.messages.update((msgs) => [...msgs, { role: 'user', content: text }]);
    this.input = '';
    this.loading.set(true);

    const history = this.messages().map((m) => ({ role: m.role, content: m.content }));

    this.chatService.send(history).subscribe({
      next: (res) => {
        this.messages.update((msgs) => [...msgs, { role: 'assistant', content: res.reply, products: res.products }]);
        this.loading.set(false);
      },
      error: () => {
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again shortly." },
        ]);
        this.loading.set(false);
      },
    });
  }
}
