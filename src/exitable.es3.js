window.m = ( function( mithril ){
  // Registry of controllers and corresponding root nodes
  var roots = new Map()

  // Register views to bind their roots to the above
  function register( view ){
    return function registeredView( ctrl ){
      var output = view.apply( this, arguments )

      while( 'length' in output )
        output = output[ 0 ]

      var config = 'config' in output.attrs && output.attrs.config
      
      output.attrs.config = function superConfig( el ){
        roots.set( ctrl, el )
        
        if( config )
          return config.apply( this, arguments )
      }

      return output
    }
  }

  // Root components (those mounted or routed) are the source of redraws.
  // Before they draw, there is no stateful virtual DOM.
  // Therefore their view execution is the source of all truth in what is currently rendered.
  function root( component ){
    var view = component.view
    
    component.view = rootView
    
    return component
  
    function rootView(){
      // All previously registered exitable components are saved here
      var previous = roots.entries()
      
      // Then we reset
      roots.clear()
      
      // Execute the view, registering all exitables
      var output   = register( view ).apply( this, arguments )
      
      // Now, set up a list of confirmed exits
      var exits    = []
      
      // For every previous exitable instance...
      while( true ){
        var step = previous.next()

        if( step.done )
          break

        // ...if it hasn't re-registered...
        if( roots.has( step.value[ 0 ] ) )
          // It's gone! Call the exit method and keep its output.
          exits.push( step.value[ 0 ].exit( entry[ 1 ] ) )
      }

      
      // If we have exits...
      if( exits.length ){
        // Noop this draw
        output = { subtree : 'retain' }
        
        // ...and all subsequent ones...
        mithril.startComputation()
       
        // ...until all exits have resolved
        mithril.sync( exits ).then( mithril.endComputation )
      }
      
      return output
    }
  }

  // Helper: transform each value in an object. Even in ES7, this is painfully contrived.
  function reduce( object, transformer ){
    var output = {}

    for( var key of object )
      if( Object.prototype.hasOwnProperty.call( object, key ) )
        output[ key ] = transformer( object[ key ] )

    return output
  }

  // Export a patched Mithril API

  // Core m function needs to sniff out components...
  function m(){
    var output = mithril.apply( this, arguments )

    for( var i = 0; i < output.children; i++ )
      if( output.children[ i ].view )
        output.children[ i ].view = register( output.children[ i ].view )
    
    return output
  }

  // Then we have all the m methods 
  for( var key in mithril )
    if( Object.prototype.hasOwnProperty.call( mithril, key ) )
      m[ key ] = mithril[ key ]
    
  // Mount and Route need to register root components for snapshot logic
  m.mount = function( el, component ){
    return mithril.mount( el, root( component ) )
  }

  m.route = function( el, path, map ){
    if( map ){
      return mithril.route( el, path, reduce( root ) )
    }
    else {
      return mithril.route.apply( this, arguments )
    }
  }
  
  return m
}( m ) );
