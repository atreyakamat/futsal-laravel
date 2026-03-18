@extends('layouts.app')

@section('title', 'AI Booking Assistant')

@section('content')
<div class="max-w-4xl mx-auto px-6 py-12">
    <div class="mb-8">
        <h1 class="text-3xl font-black uppercase text-white mb-2">AI <span class="text-primary">Assistant</span></h1>
        <p class="text-gray-400">Chat with our AI to check availability, pricing, and book your futsal slots.</p>
    </div>

    <div class="bg-surface border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[600px]" x-data="chatBot()">
        
        <!-- Chat Header -->
        <div class="bg-black/50 border-b border-white/10 p-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span class="material-symbols-outlined text-primary">robot_2</span>
            </div>
            <div>
                <h2 class="font-bold text-white">FutsalGoa AI</h2>
                <div class="flex items-center gap-2 text-xs text-gray-400">
                    <div class="w-2 h-2 rounded-full bg-primary animate-pulse"></div> Online
                </div>
            </div>
        </div>

        <!-- Chat Messages -->
        <div class="flex-1 p-6 overflow-y-auto flex flex-col gap-4 bg-surface" id="chat-messages">
            <template x-for="message in messages">
                <div :class="message.role === 'user' ? 'self-end bg-primary/20 border-primary/30 text-white' : 'self-start bg-white/5 border-white/10 text-gray-300'" 
                     class="max-w-[80%] rounded-2xl p-4 border shadow-sm">
                    <div class="flex items-center gap-2 mb-1 opacity-70">
                        <span class="material-symbols-outlined text-[14px]" x-text="message.role === 'user' ? 'person' : 'smart_toy'"></span>
                        <span class="text-xs font-bold uppercase" x-text="message.role === 'user' ? 'You' : 'AI'"></span>
                    </div>
                    <div class="text-sm prose prose-invert max-w-none" x-html="formatMessage(message.content)"></div>
                </div>
            </template>
            <div x-show="loading" class="self-start bg-white/5 border border-white/10 max-w-[80%] rounded-2xl p-4 flex gap-2 items-center">
                <div class="w-2 h-2 rounded-full bg-primary/50 animate-bounce"></div>
                <div class="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style="animation-delay: 0.2s"></div>
                <div class="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style="animation-delay: 0.4s"></div>
            </div>
        </div>

        <!-- Chat Input -->
        <div class="p-4 bg-black/50 border-t border-white/10">
            <form @submit.prevent="sendMessage" class="flex gap-3">
                <input type="text" x-model="input" 
                       class="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-gray-500" 
                       placeholder="Ask about arenas, slots, pricing..." required :disabled="loading">
                <button type="submit" 
                        class="bg-primary text-black font-black px-6 py-3 rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        :disabled="loading || input.trim() === ''">
                    <span>SEND</span>
                    <span class="material-symbols-outlined">send</span>
                </button>
            </form>
        </div>
    </div>
</div>

<script>
    function chatBot() {
        return {
            input: '',
            messages: [
                { role: 'assistant', content: 'Hello! I can help you check futsal slot availability and pricing. How can I assist you today?' }
            ],
            loading: false,
            
            formatMessage(text) {
                // simple markdown-like formatting for bold
                return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            },

            async sendMessage() {
                if (this.input.trim() === '') return;

                const userMessage = this.input;
                this.messages.push({ role: 'user', content: userMessage });
                this.input = '';
                this.loading = true;

                this.scrollToBottom();

                try {
                    const response = await fetch('/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '{{ csrf_token() }}',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ message: userMessage })
                    });

                    const data = await response.json();
                    
                    this.messages.push({ role: 'assistant', content: data.reply });
                } catch (error) {
                    console.error('Error:', error);
                    this.messages.push({ role: 'assistant', content: 'Sorry, I encountered an error connecting to the server.' });
                } finally {
                    this.loading = false;
                    this.scrollToBottom();
                }
            },
            
            scrollToBottom() {
                this.$nextTick(() => {
                    const container = document.getElementById('chat-messages');
                    container.scrollTop = container.scrollHeight;
                });
            }
        }
    }
</script>
@endsection
