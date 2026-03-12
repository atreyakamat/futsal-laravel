<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Futsal Booking Chat</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <meta name="csrf-token" content="{{ csrf_token() }}">
</head>
<body class="bg-gray-100 flex items-center justify-center h-screen" x-data="chatBot()">

    <div class="bg-white w-full max-w-md rounded-lg shadow-lg overflow-hidden flex flex-col h-[600px]">
        <div class="bg-blue-600 text-white p-4">
            <h2 class="text-xl font-bold">Futsal Booking Assistant</h2>
            <p class="text-sm opacity-80">Ask me about arenas, pricing, or availability!</p>
        </div>

        <div class="flex-1 p-4 overflow-y-auto flex flex-col gap-3" id="chat-messages">
            <template x-for="message in messages">
                <div :class="message.role === 'user' ? 'self-end bg-blue-100' : 'self-start bg-gray-100'" 
                     class="max-w-[80%] rounded-lg p-3">
                    <p class="text-sm" x-text="message.content"></p>
                </div>
            </template>
            <div x-show="loading" class="self-start bg-gray-100 max-w-[80%] rounded-lg p-3">
                <p class="text-sm italic text-gray-500">Thinking...</p>
            </div>
        </div>

        <div class="p-4 border-t border-gray-200">
            <form @submit.prevent="sendMessage" class="flex gap-2">
                <input type="text" x-model="input" 
                       class="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                       placeholder="Type your message..." required :disabled="loading">
                <button type="submit" 
                        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        :disabled="loading || input.trim() === ''">
                    Send
                </button>
            </form>
        </div>
    </div>

    <script>
        function chatBot() {
            return {
                input: '',
                messages: [
                    { role: 'assistant', content: 'Hi! I can help you check futsal slot availability and pricing. What would you like to know?' }
                ],
                loading: false,
                async sendMessage() {
                    if (this.input.trim() === '') return;

                    const userMessage = this.input;
                    this.messages.push({ role: 'user', content: userMessage });
                    this.input = '';
                    this.loading = true;

                    // Scroll to bottom
                    this.$nextTick(() => {
                        const container = document.getElementById('chat-messages');
                        container.scrollTop = container.scrollHeight;
                    });

                    try {
                        const response = await fetch('/chat', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
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
                        this.$nextTick(() => {
                            const container = document.getElementById('chat-messages');
                            container.scrollTop = container.scrollHeight;
                        });
                    }
                }
            }
        }
    </script>
</body>
</html>
