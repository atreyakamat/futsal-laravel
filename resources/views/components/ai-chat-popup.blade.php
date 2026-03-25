<div x-data="aiChat()" class="fixed bottom-6 right-6 z-50" x-cloak>
    <!-- Chat Toggle Button -->
    <button @click="toggleChat()" class="bg-primary hover:scale-105 text-black rounded-full p-4 shadow-[0_0_30px_rgba(13,242,32,0.3)] transition-all transform flex items-center justify-center relative group">
        <div class="absolute inset-0 rounded-full border border-primary/50 animate-ping group-hover:animate-none"></div>
        <span x-show="!isOpen" class="material-symbols-outlined font-black">smart_toy</span>
        <span x-show="isOpen" class="material-symbols-outlined font-black">close</span>
    </button>

    <!-- Chat Window -->
    <div x-show="isOpen" 
         x-transition:enter="transition ease-out duration-300"
         x-transition:enter-start="opacity-0 translate-y-10 scale-95"
         x-transition:enter-end="opacity-100 translate-y-0 scale-100"
         x-transition:leave="transition ease-in duration-200"
         x-transition:leave-start="opacity-100 translate-y-0 scale-100"
         x-transition:leave-end="opacity-0 translate-y-10 scale-95"
         class="absolute bottom-20 right-0 w-[350px] md:w-96 glass bg-black/80 rounded-[2rem] shadow-2xl shadow-black/50 border border-white/10 flex flex-col overflow-hidden">
        
        <!-- Header -->
        <div class="p-5 border-b border-white/5 flex items-center gap-4 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] rounded-full -mr-10 -mt-10"></div>
            <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 relative z-10">
                <span class="material-symbols-outlined text-primary text-2xl">sports_soccer</span>
            </div>
            <div class="relative z-10">
                <h3 class="font-black leading-tight uppercase tracking-tight text-white">AI Concierge</h3>
                <div class="flex items-center gap-1.5 mt-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Online | Ready to Assist</p>
                </div>
            </div>
        </div>

        <!-- Messages Area -->
        <div id="chat-messages" class="flex-1 p-5 h-[400px] overflow-y-auto space-y-6 no-scrollbar relative z-10">
            <template x-for="(msg, index) in messages" :key="index">
                <div :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
                    <div :class="msg.role === 'user' ? 'bg-primary text-black rounded-tr-sm' : 'glass rounded-tl-sm text-white'"
                         class="max-w-[85%] rounded-2xl px-5 py-3 text-sm shadow-lg leading-relaxed relative">
                        
                        <div x-html="renderMessage(msg.content)"></div>

                        <!-- Render Choice Buttons if Assistant Message -->
                        <template x-if="msg.role === 'assistant' && hasChoices(msg.content)">
                            <div class="mt-4 flex flex-wrap gap-2">
                                <template x-for="choice in getChoices(msg.content)">
                                    <button @click="selectChoice(choice)" 
                                            class="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-black hover:border-primary transition-all text-gray-300">
                                        <span x-text="choice"></span>
                                    </button>
                                </template>
                            </div>
                        </template>
                    </div>
                </div>
            </template>
            <div x-show="isTyping" class="flex justify-start">
                <div class="glass rounded-2xl rounded-tl-sm px-5 py-3 flex gap-1">
                    <span class="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                    <span class="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
                    <span class="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                </div>
            </div>
        </div>

        <!-- Input -->
        <div class="p-4 border-t border-white/5 bg-black/50 backdrop-blur-xl relative z-10">
            <div class="flex gap-2">
                <input type="text" 
                       x-model="userInput" 
                       @keydown.enter="sendMessage()"
                       placeholder="Ask about arenas or availability..."
                       class="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-primary text-sm text-white placeholder:text-gray-600 transition-colors">
                <button @click="sendMessage()" class="w-12 h-12 bg-primary text-black rounded-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                    <span class="material-symbols-outlined font-black">send</span>
                </button>
            </div>
            <div class="text-center mt-3">
                <span class="text-[8px] font-bold text-gray-600 uppercase tracking-[0.2em]">Powered by Advanced AI</span>
            </div>
        </div>
    </div>
</div>

<style>
[x-cloak] { display: none !important; }
/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar { display: none; }
/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>

<script>
function aiChat() {
    return {
        isOpen: false,
        userInput: '',
        isTyping: false,
        messages: [],
        
        init() {
            // Check if there is existing history from the server (in a real app, you might pass this via blade)
            // For now, default greeting
            this.messages = [
                { 
                    role: 'assistant', 
                    content: 'Welcome to FutsalGoa! ⚡ I can help you find and book a court in seconds. Which arena would you like to check? [CHOICE: Mapusa] [CHOICE: Assagao] [CHOICE: Panjim]' 
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
                
                const urlMatch = data.reply.match(/https?:\/\/[^\s]+/);
                if (urlMatch) {
                    this.messages.push({ role: 'assistant', content: data.reply + '<br><br><strong class="text-primary text-xs uppercase tracking-widest animate-pulse flex items-center gap-2 mt-4"><span class="material-symbols-outlined text-sm">open_in_new</span> Redirecting to secure checkout...</strong>' });
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
                this.messages.push({ role: 'assistant', content: '⚡ Systems overloaded. Please try again in a moment.' });
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