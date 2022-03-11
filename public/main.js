$(function() {
   const FADE_TIME = 375; // milliseconds
   const TYPING_TIMER_LENGTH = 800; // milliseconds
   const COLORS = [
     '#e21400', '#91580f', '#f8a700', '#f78b00',
     '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
     '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
   ];
 
   // Initialize variables
   const $window = $(window);
   const $usernameInput = $('.usernameInput'); // Input for username
   const $messages = $('.messages');           // Messages area
   const $inputMessage = $('.inputMessage');   // Input message input box
 
   const $loginPage = $('.login.page');        // The login page
   const $chatPage = $('.chat.page');          // The chatroom page
 
   const socket = io();
 
   // asks for username
   let username;
   let connected = false;
   let typing = false;
   let lastTypingTime;
   let $currentInput = $usernameInput.focus();
 
   const addUserMessage = (data) => {
     let message = '';
     if (data.numUsers === 1) {
       message += `there's 1 user`;
     } else {
       message += `there are ${data.numUsers} users`;
     }
     log(message);
   }
 
   // Sets the username
   const setUsername = () => {
     username = $usernameInput.val().trim();
 
     if (username) {
       $loginPage.fadeOut();
       $chatPage.show();
       $loginPage.off('click');
       $currentInput = $inputMessage.focus();
 
       socket.emit('add user', username);
     }
   }
 
   const sendMessage = () => {
     let message = $inputMessage.val();
     if (message && connected) {
       $inputMessage.val('');
       addChatMessage({ username, message });
       socket.emit('new message', message);
     }
   }
 
   const log = (message, options) => {
     const $el = $('<li>').addClass('log').text(message);
     addMessageElement($el, options);
   }
 
   // Adds chat message
   const addChatMessage = (data, options = {}) => {
     const $typingMessages = getTypingMessages(data);
     if ($typingMessages.length !== 0) {
       options.fade = false;
       $typingMessages.remove();
     }
 
     const $usernameDiv = $('<span class="username"/>')
       .text(data.username+":")
       .css('color', getUsernameColor(data.username));
     const $messageBodyDiv = $('<span class="messageBody">')
       .text(data.message);
 
     const typingClass = data.typing ? 'typing' : '';
     const $messageDiv = $('<li class="message"/>')
       .data('username', data.username)
       .addClass(typingClass)
       .append($usernameDiv, $messageBodyDiv);
 
     addMessageElement($messageDiv, options);
   }
 
   // Adds name is typing message
   const addChatTyping = (data) => {
     data.typing = true;
     data.message = 'is typing';
     addChatMessage(data);
   }
 
   // Removes name is typing message
   const removeChatTyping = (data) => {
     getTypingMessages(data).fadeOut(function () {
       $(this).remove();
     });
   }
 

   const addMessageElement = (el, options) => {
     const $el = $(el);
     if (!options) {
       options = {};
       console.log(options)
     }
     if (typeof options.fade === 'undefined') {
       options.fade = true;
     }
     if (typeof options.prepend === 'undefined') {
       options.prepend = false;
     }
     if (options.fade) {
       $el.hide().fadeIn(FADE_TIME);
     }
     if (options.prepend) {
       $messages.prepend($el);
     } else {
       $messages.append($el);
     }
 
     $messages[0].scrollTop = $messages[0].scrollHeight;
   }
 

 
   // Updates the typing event
   const updateTyping = () => {
     if (connected) {
       if (!typing) {
         typing = true;
         socket.emit('typing');
       }
       lastTypingTime = (new Date()).getTime();
 
       setTimeout(() => {
         const typingTimer = (new Date()).getTime();
         const timeDiff = typingTimer - lastTypingTime;
         if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
           socket.emit('stop typing');
           typing = false;
         }
       }, TYPING_TIMER_LENGTH);
     }
   }
 
   // Gets the user is typing message
   const getTypingMessages = (data) => {
     return $('.typing.message').filter(function (i) {
       return $(this).data('username') === data.username;
     });
   }
 
   // Gets color for username
   const getUsernameColor = (username) => {
     let hash = 7;
     for (let i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
     }
     // Calculate color
     const index = Math.abs(hash % COLORS.length);
     return COLORS[index];
   }
 
 
   $window.keydown(event => {
     if (!(event.ctrlKey || event.metaKey || event.altKey)) {
       $currentInput.focus();
     }
     // When the client hits ENTER on their keyboard
     if (event.which === 13) {
       if (username) {
         sendMessage();
         socket.emit('stop typing');
         typing = false;
       } else {
         setUsername();
       }
     }
   });
 
   $inputMessage.on('input', () => {
     updateTyping();
   });
 

 
   // Focus user to only get to input on login screen
   $loginPage.click(() => {
     $currentInput.focus();
   });
 
   // Focus user to only get to input on chat screen
   $inputMessage.click(() => {
     $inputMessage.focus();
   });
 
 
   // forces login
   socket.on('login', (data) => {
     connected = true;
     const message = "Welcome to Dave's Socket.IO Chat";
     log(message, {
       prepend: true
     });
     addUserMessage(data);
   });
 
   socket.on('new message', (data) => {
     addChatMessage(data);
   });
 
   //when user joins
   socket.on('user joined', (data) => {
     if(data.username.toLowerCase() === 'f'){
       log(`F's in the chat`)
     }else{
      log(`${data.username} joined`);
     }
     addUserMessage(data);
   });
 
   // when user leaves
   socket.on('user left', (data) => {
     log(`${data.username} left`);
     addUserMessage(data);
     removeChatTyping(data);
   });
 
   // when user is typing
   socket.on('typing', (data) => {
     addChatTyping(data);
   });
 
   // stop showing the ... is typing 
   socket.on('stop typing', (data) => {
     removeChatTyping(data);
   });
 
   socket.on('disconnect', () => {
     log('you have been disconnected');
   });
 
   socket.io.on('reconnect', () => {
     log('you have been reconnected');
     if (username) {
       socket.emit('add user', username);
     }
   });
 
   socket.io.on('reconnect_error', () => {
     log('attempt to reconnect has failed');
   });
 
 });