// Chatbot functionality
document.addEventListener('DOMContentLoaded', function() {
	const sendButton = document.getElementById('chatbot-send');
	const inputField = document.getElementById('chatbot-input');
	const closeButton = document.getElementById('chatbot-close');
	const toggleButton = document.getElementById('chatbot-toggle');
	const chatbot = document.getElementById('chatbot');
	let isFirstOpen = true;

	if (sendButton) {
		sendButton.addEventListener('click', function() {
			sendMessage();
		});
	}

	if (inputField) {
		inputField.addEventListener('keypress', function(event) {
			if (event.key === 'Enter') {
				sendMessage();
			}
		});
	}

	if (closeButton) {
		closeButton.addEventListener('click', function() {
			chatbot.classList.remove('open');
			chatbot.style.display = 'none';
			toggleButton.style.display = 'block'; // Réafficher le bouton d'ouverture
		});
	}

	if (toggleButton) {
		toggleButton.addEventListener('click', function() {
			if (chatbot.classList.contains('open')) {
				chatbot.classList.remove('open');
				chatbot.style.display = 'none';
				toggleButton.style.display = 'block'; // Réafficher le bouton d'ouverture
			} else {
				chatbot.classList.add('open');
				chatbot.style.display = 'block';
				toggleButton.style.display = 'none'; // Masquer le bouton d'ouverture
				startConversation();
				if (isFirstOpen) {
					setTimeout(scrollToTop, 100); // Scroll to top when opening the chatbot for the first time
					isFirstOpen = false;
				} else {
					scrollToPenultimateMessage(); // Scroll to the penultimate message when reopening the chatbot
				}
			}
		});
	}

	// Initially hide chatbot
	if (chatbot) {
		chatbot.style.display = 'none';
	}
});

const chatContainer = document.getElementById('chatbot-messages');
let isAtBottom = true;

function sendMessage(message) {
	const input = document.getElementById('chatbot-input');
	if (!message) {
		message = input.value;
	}
	if (message.trim() !== '') {
		message = message.charAt(0).toUpperCase() + message.slice(1); // Capitalize first letter
		const messages = document.getElementById('chatbot-messages');
		const userMessage = document.createElement('div');
		userMessage.className = 'chatbot-message user';
		userMessage.innerHTML = `
			<div style="color:#FFF;margin-bottom:5px" class="sender">Vous</div>
			${message}
			<div class="timestamp" style="color:#FFF;margin-top:5px">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
		`;
		messages.appendChild(userMessage);
		input.value = '';

		// Show typing indicator
		showTypingIndicator();

		// Send message to server
		fetch('/chatbot', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ message: message })
		})
		.then(response => response.json())
		.then(data => {
			hideTypingIndicator();
			const botMessage = document.createElement('div');
			botMessage.className = 'chatbot-message bot';
			let response = data.response.charAt(0).toUpperCase() + data.response.slice(1);

			// Format lists with line breaks
			response = response.replace(/<\/li><li>/g, '</li><br><li>');

			// Embed YouTube videos
			response = response.replace(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g, '<iframe width="100%" height="315" src="https://www.youtube.com/embed/$1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>');

			botMessage.innerHTML = `
				<div class="sender" style="">Bot Moana Energy</div>
				${response}
				<div class="timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
			`;
			messages.appendChild(botMessage);

			 // Scroll to next sender
			scrollToNextSender();

			// Show typing indicator before suggestions
			setTimeout(showTypingIndicator, 5000);

			// Add suggestions after a delay
			setTimeout(() => {
				hideTypingIndicator();
				addSuggestions();
			}, 10000);
		})
		.catch(error => {
			hideTypingIndicator();
			console.error('Erreur lors de la communication avec le serveur:', error);
			const errorMessage = document.createElement('div');
			errorMessage.className = 'chatbot-message bot';
			errorMessage.innerHTML = `
				<div class="sender" style="margin-bottom:5px">Bot Moana Energy</div>
				Je suis désolé, une erreur est survenue. Veuillez réessayer plus tard.
				<div class="timestamp style="margin-top:5px">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
			`;
			messages.appendChild(errorMessage);

			 // Scroll to next sender
			scrollToNextSender();

			// Show typing indicator before suggestions
			setTimeout(showTypingIndicator, 5000);

			// Add suggestions even if there is an error
			setTimeout(() => {
				hideTypingIndicator();
				addSuggestions();
			}, 10000);
		});
	}
}

function startConversation() {
	const messages = document.getElementById('chatbot-messages');
	const botMessage = document.createElement('div');
	botMessage.className = 'chatbot-message bot';
	botMessage.innerHTML = `
		<div class="sender" style="margin-bottom:5px">Bot Moana Energy</div>
		Bonjour ! Je suis un assistant virtuel dédié à répondre aux questions concernant le dashboard de Moana Energy. Comment puis-je vous aider aujourd'hui ?
		<div class="timestamp" style="margin-top:5px">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
	`;
	messages.appendChild(botMessage);

	// Scroll to next sender
	scrollToNextSender();

	// Add suggestions
	addSuggestions();
}

function addSuggestions() {
	const messages = document.getElementById('chatbot-messages');
	const botMessage = document.createElement('div');
	botMessage.className = 'chatbot-message bot';
	botMessage.innerHTML = `
		<div class="sender" style="margin-bottom:5px">Bot Moana Energy</div>
		Si vous souhaitez plus d'informations, veuillez sélectionner une question ci-dessous :
		<div class="timestamp" style="margin-top:5px">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
	`;
	messages.appendChild(botMessage);

	fetch('/js/siteContent.json')
		.then(response => response.json())
		.then(data => {
			const suggestionsContainer = document.createElement('div');
			suggestionsContainer.className = 'chatbot-suggestions';

			Object.keys(data).forEach(sectionKey => {
				const section = data[sectionKey];
				section.sections.forEach(subSection => {
					console.log(subSection);
					
					const suggestionButton = document.createElement('button');
					suggestionButton.className = 'chatbot-suggestion-button';
					suggestionButton.innerText = subSection.title;
					suggestionButton.addEventListener('click', () => {
						sendMessage(subSection.title);
						scrollToBottom(); // Scroll to bottom when a suggestion is clicked
					});
					suggestionsContainer.appendChild(suggestionButton);
					console.log(subSection.content);
					
					// Ajouter les questions de la FAQ en tant que sous-suggestions
					if (
						subSection && // Vérifie que subSection existe
						Array.isArray(subSection.faq) && // Vérifie que content est un tableau
						subSection.faq.length > 0 && // Vérifie que le tableau n'est pas vide
						subSection.faq // Vérifie que faq existe dans le premier élément
					  ) {
						console.log(subSection);
						subSection.faq.forEach(faqItem => {
							const faqButton = document.createElement('button');
							faqButton.className = 'chatbot-faq-button';
							faqButton.innerText = faqItem.question;
							faqButton.style.marginLeft = '20px'; // Indentation pour les sous-suggestions
							faqButton.addEventListener('click', () => {
								sendMessage(faqItem.question);
								scrollToBottom(); // Scroll to bottom when a FAQ question is clicked
							});
							suggestionsContainer.appendChild(faqButton);
						});
					}
				});
			});

			messages.appendChild(suggestionsContainer);

			// Scroll to next sender
			scrollToNextSender();

		})
		.catch(error => {
			console.error('Erreur lors de la récupération des suggestions:', error);
			// Add suggestions even if there is an error
			addSuggestions();
		});
}

function showTypingIndicator() {
	const messages = document.getElementById('chatbot-messages');
	const typingIndicator = document.createElement('div');
	typingIndicator.id = 'typing-indicator';
	typingIndicator.style.width='fit-content'
	typingIndicator.className = 'chatbot-message bot';
	typingIndicator.innerHTML = `
		<div class="typing-dots">
		<span></span><span></span><span>
		</div>

	`;
	messages.appendChild(typingIndicator);
}

function hideTypingIndicator() {
	const typingIndicator = document.getElementById('typing-indicator');
	if (typingIndicator) {
		typingIndicator.remove();
	}
}

function scrollToNextSender() {
	const messages = document.querySelectorAll('.chatbot-message');
	if (messages.length > 1) {
		const lastMessage = messages[messages.length - 2];
		const nextMessage = lastMessage.nextElementSibling;
		if (nextMessage) {
			nextMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
}

function scrollToBottom() {
	chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
}

function scrollToTop() {
	chatContainer.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToPenultimateMessage() {
	const messages = document.querySelectorAll('.chatbot-message');
	if (messages.length > 1) {
		const penultimateMessage = messages[messages.length - 2];
		if (penultimateMessage) {
			penultimateMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}
}