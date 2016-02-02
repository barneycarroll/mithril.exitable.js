# mithril.exitable.js
Exit animations for Mithril components: provide controllers with an `exit` hook which will trigger when the component disappears from the virtual DOM (but before it's removed from live DOM), locking the draw process while you perform animations.
