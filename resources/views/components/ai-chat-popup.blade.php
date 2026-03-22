<div x-data="aiChat()" class="fixed bottom-6 right-6 z-50" x-cloak>
    <!-- Chat Toggle Button -->
    <button @click="toggleChat()" class="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all transform hover:scale-110 flex items-center justify-center">
        <svg x-show="!isOpen" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
        <svg x-show="isOpen" class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>

    <!-- Chat Window -->
    <div x-show="isOpen" 
         x-transition:enter="transition ease-out duration-300"
         x-transition:enter-start="opacity-0 translate-y-10 scale-95"
         x-transition:enter-end="opacity-100 translate-y-0 scale-100"
         class="absolute bottom-20 right-0 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden chat-glass">
        
        <!-- Header -->
        <div class="bg-green-500 p-4 text-white flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">⚽</div>
            <div>
                <h3 class="font-bold leading-tight">FutsalGoa Concierge</h3>
                <p class="text-xs opacity-80">Online | Click & Book</p>
            </div>
        </div>

        <!-- Messages Area -->
        <div id="chat-messages" class="flex-1 p-4 h-96 overflow-y-auto space-y-4 bg-gray-50/50">
            <template x-for="(msg, index) in messages" :key="index">
                <div :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
                    <div :class="msg.role === 'user' ? 'bg-green-500 text-white' : 'bg-white text-gray-800 border'"
                         class="max-w-[85%] rounded-2xl px-4 py-2 shadow-sm text-sm">
                        
                        <div x-html="renderMessage(msg.content)"></div>

                        <!-- Render Choice Buttons if Assistant Message -->
                        <template x-if="msg.role === 'assistant' && hasChoices(msg.content)">
                            <div class="mt-3 flex flex-wrap gap-2">
                                <template x-for="choice in getChoices(msg.content)">
                                    <button @click="selectChoice(choice)" 
                                            class="bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-bold hover:bg-green-500 hover:text-white transition-all">
                                        <span x-text="choice"></span>
                                    </button>
                                </template>
                            </div>
                        </template>
                    </div>
                </div>
            </template>
            <div x-show="isTyping" class="flex justify-start">
                <div class="bg-white border rounded-2xl px-4 py-2 shadow-sm">
                    <span class="animate-pulse text-green-500 font-bold">●●●</span>
                </div>
            </div>
        </div>

        <!-- Input -->
        <div class="p-4 bg-white border-t">
            <div class="flex gap-2">
                <input type="text" 
                       x-model="userInput" 
                       @keydown.enter="sendMessage()"
                       placeholder="Type or click options..."
                       class="flex-1 border-gray-200 rounded-xl focus:ring-green-500 focus:border-green-500 text-sm text-black">
                <button @click="sendMessage()" class="bg-green-500 text-white p-2 rounded-xl hover:bg-green-600 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
            </div>
        </div>
    </div>
</div>

<style>
[x-cloak] { display: none !important; }
.chat-glass {
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
}
</style>

<script>
function aiChat() {
    return {
        isOpen: false,
        userInput: '',
        isTyping: false,
        messages: [],
        
        init() {
            // Initial greeting with choices
            this.messages = [
                { 
                    role: 'assistant', 
                    content: 'Welcome to FutsalGoa! ⚽ I can help you find and book a court in seconds. Which arena would you like to check? [CHOICE: Mapusa] [CHOICE: Assagao] [CHOICE: Panjim]' 
                }
            ];
        },

        toggleChat() {
            this.isOpen = !this.isOpen;
            if (this.isOpen) {
                this.scrollToBottom();
            }
        },

        renderMessage(content) {
            // Remove choice tags for clean display and convert line breaks
            return content.replace(/\[CHOICE: (.*?)\]/g, '').trim().replace(/\n/g, '<br>');
        },

        hasChoices(content) {
            return content.includes('[CHOICE:');
        },

        getChoices(content) {
            const matches = content.match(/\[CHOICE: (.*?)\]/g);
            if (!matches) return [];
            return matches.map(m => m.replace('[CHOICE: ', '').replace(']', ''));
        },

        selectChoice(choice) {
            this.sendMessage(choice);
        },

        async sendMessage(overrideText = null) {
            const text = overrideText || this.userInput;
            if (!text.trim()) return;

            // Clear input if manual
            if (!overrideText) this.userInput = '';

            this.messages.push({ role: 'user', content: text });
            this.isTyping = true;
            this.scrollToBottom();

            try {
                const response = await fetch('{{ route('chat') }}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    },
                    body: JSON.stringify({ message: text })
                });

                if (!response.ok) throw new Error('Network response was not ok');

                const data = await response.json();
                this.isTyping = false;
                
                // Detect checkout URL
                const urlMatch = data.reply.match(/https?:\/\/[^\s]+/);
                if (urlMatch) {
                    this.messages.push({ role: 'assistant', content: data.reply + '<br><br><strong class="text-green-600 animate-pulse">Redirecting to checkout...</strong>' });
                    this.scrollToBottom();
                    setTimeout(() => {
                        window.location.href = urlMatch[0];
                    }, 2000);
                } else {
                    this.messages.push({ role: 'assistant', content: data.reply });
                    this.scrollToBottom();
                }

            } catch (e) {
                console.error(e);
                this.isTyping = false;
                this.messages.push({ role: 'assistant', content: '⚽ Sorry, I slipped! Please try again.' });
                this.scrollToBottom();
            }
        },

        scrollToBottom() {
            this.$nextTick(() => {
                const el = document.getElementById('chat-messages');
                if (el) {
                    el.scrollTop = el.scrollHeight;
                }
            });
        }
    }
}
</script>
