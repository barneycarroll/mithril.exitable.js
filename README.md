# mithril.exitable.js

[![Join the chat at https://gitter.im/barneycarroll/mithril.exitable.js](https://badges.gitter.im/barneycarroll/mithril.exitable.js.svg)](https://gitter.im/barneycarroll/mithril.exitable.js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

A [Mithril](http://mithril.js.org/) wrapper whose controllers gain a new `exit` hook for outgoing animations. Exitable is intended for use with the Mithril 0 API - it is redundant in (at the time of writing, forthcoming) Mithril 1, thanks to the [`onbeforeremove`](https://github.com/lhorie/mithril.js/blob/rewrite/docs/lifecycle-methods.md#onbeforeremove) hook.

When you bind an `exit` method to a controller, we observe the output of each draw: as soon as we detect that the corresponding component has been removed from the view, the draw loop is frozen; all your animations execute, and when they're done, Mithril goes about business as usual.

## Demos

* [x] [Alternating components](https://jsfiddle.net/barney/xko3kdaL/)
* [x] [Modal popup](https://jsfiddle.net/barney/gft3467m/)
* [ ] Dynamic lists
* [ ] Some kind of Bootstrap / Material Design kitchen sink interface

…suggest more in the issues!

## Usage

Exitable is a Mithril wrapper or patch, meaning you need to bring your own Mithril for Exitable to use as a base. Exitable then wraps certain Mithril methods to extend it with its own behaviour, and returns you a patched version of Mithril to use in your application.

This means your original Mithril is untouched, and eg any other Mithril dependent plugins in your codebase will get access to the 'clean' version rather than going through Exitable, in contrast to eg jQuery plugins which modify the core jQuery object.

### Which source?

#### ES6 / CommonJS / Browserify

The Exitable module depends on Mithril being available as a module as `mithril`. In turn, you should import Exitable instead of plain Mithril.

```javascript
// ES6
import m from 'mithril.exitable'
// CommonJS
var m = require( 'mithril.exitable' )
```

#### ES3

The ES3 version assumes a browser global environment. It will require a [Map]() polyfill – I recommend [Andrea Giammarchi's ES6 collections](https://github.com/WebReflection/es6-collections) if this is your only outstanding jsnext dependency. You must include Mithril and your Map polyfill (if necessary) before including Exitable. Exitable will then replace the `window.m` reference:

```html
<script src="https://cdn.rawgit.com/WebReflection/es6-collections/master/es6-collections.js"></script>
<script src="https://cdn.rawgit.com/lhorie/mithril.js/next/mithril.min.js"></script>
<script src="https://cdn.rawgit.com/barneycarroll/mithril.exitable.js/master/src/exitable.es3.js"></script>
```

### Binding `exit` animations

To register an exit animation, bind a function to the `exit` key of the controller instance:

```javascript
var myComponent {
  controller : function(){
    this.exit = myAnimation
  },
  // ...
}
```

The animation function receives the live DOM element representing the root of the component that's about to be removed from the document.

```javascript
// ...
    this.exit = function(el){
      // ...
    }
// ...
```

For convenience, Exitable also provides an `enter` method hook, so you can define entry and exit animations in the same place.

```javascript
{
  controller : function(){
    this.enter = function(el){
      // ...
    }
  },
  view : () =>
    m( '.root' )
}

// Is equivalent to

{
  view : () =>
    m( '.root', {
      config : ( el, init ) => {
        if( !init )
          // ...
      }
    } )
}
```

### `exit` functions

What should the animation do? That's up to you: although I highly recommend Julian Shapiro's [Velocity](http://julian.com/research/velocity/) library, which can be supplemented with a [UI pack](http://julian.com/research/velocity/#uiPack) full of pre-registered animations (which are used throughout the demos).

All `exit` functions must return a '[thenable](https://promisesaplus.com/)' so that Exitable knows when all animations are finished in order to resume Mithril's draw loop.

#### Velocity

Velocity returns thenables by default, which makes exit animations nice and terse, especially with the help of arrow functions:

```javascript
this.exit = el =>
  Velocity( el, 'fadeOut' )
```

#### Other libs

If your tool of choice doesn't return Promises, you can create your own Promise and bind it to the done callback (or whatever hooks the animation library provides):

```javascript
this.exit = el =>
  new Promise( done =>
    $( el ).fadeOut( done  )
  )
```

#### Without Promises

…and if you can't return thenables or use Promises, then you have to make your own thenable. Exitable doesn't depened upon chaining or suchlike, so anything with a `then` method which executes at the right time will do:

```javascript
this.exit = function( el ){
  var thenable = { then : function(){} }

  $( el ).fadeOut( thenable.then )

  return thenable
}
