import mithril from 'mithril'

// Registry of controllers and corresponding root nodes
const roots     = new Map()
// A record of recent view outputs for every root-level component
const history   = new WeakMap()
// Whether the current draw is being used to revert to its previous state
let   reverting = false

// Register views to bind their roots to the above
const register = view =>
  function registeredView( ctrl ){
    const output     = view( ...arguments )

    // Don't register exits during a reversion
    if( reverting )
      return output

    const { attrs }  = output
    const { config } = attrs
    
    if( ctrl.exit )
      attrs.config = function superConfig( el ){
        roots.set( ctrl, el )
      
        if( config )
          return config.call( this, ...arguments )
      }
    
    return output
  }


// Root components (those mounted or routed) are the source of redraws.
// Before they draw, there is no stateful virtual DOM.
// Therefore their view execution is the source of all truth in what is currently rendered.
const root = ( { view, ...component } ) =>
  Object.assign( component, {
    view : function rootView( ctrl ){
      // If we are in the middle of a reversion, we just want to patch 
      // Mithril's internal virtual DOM HEAD to what it was before the
      // last output
      if( reverting )
        return history.get( ctrl )

      // All previously registered exitable components are saved here
      const previous = Array.from( roots )
      
      // Then we reset
      roots.clear()

      // Execute the view, registering all exitables
      let output     = register( view ).call( this, ...arguments )

      // Record the output, we will need to return to this state if the next draw has exits
      history.set( ctrl, output )
      
      // Now, set up a list of confirmed exits
      const exits    = []
      
      // For every previous exitable instance...
      for( let [ ctrl, el ] of previous )
        // ...if it hasn't re-registered...
        if( !roots.has( ctrl ) )
          // It's gone! Call the exit method and keep its output.
          exits.push( ctrl.exit( el ) )
      
      // If we have exits...
      if( exits.length ){
        // Noop this draw
        output = { subtree : 'retain' }
        
        // Freeze the draw process
        m.startComputation()
       
        // ...until all exits have resolved
        Promise.all( exits ).then( () => {
          // We now need to revert Mithril's internal virtual DOM head so that 
          // it will correctly patch the live DOM to match the state in which 
          // components are removed: it currently believes that already happend
          // Because it ran the diff before we told it to retain the subtree at
          // the last minute
          reverting = true
          
          // Next draw should not patch, only diff
          m.redraw.strategy( 'none' )

          // Force a synchronous draw despite being frozen
          m.redraw( true )
					
          // Now it's as if we were never here to begin with
          reverting = false

          // Resume business as usual
          m.endComputation()
        } )
      }
      
      return output
    }
  } )

// Helper: transform each value in an object. Even in ES7, this is painfully contrived.
const reduce = ( object, transformer ) =>
  Object.keys( object ).reduce(
    ( output, key ) =>
      Object.assign( output, {
        [ key ] : transformer( object[ key ] )
      } ),
    {}
  )

// Export a patched Mithril API
export default Object.assign(
  // Core m function needs to sniff out components...
  function m(){
    const output = mithril( ...arguments )
    
    output.children.forEach( child => {
      const { view } = child

      if( view )
        // ...and get their views to register controllers and root nodes
        Object.assign( child, {
          view : register( view )
        } )
    } )
    
    return output
  },
  
  // Then we have all the m methods 
  mithril,
  
  // Mount and Route need to register root components for snapshot logic
  {
    mount : ( el, component ) =>
      mithril.mount( el, root( component ) ),
    
    route( el, path, map ){
      if( map ){
        return mithril.route( el, path, reduce( root ) )
      }
      else {
        return mithril.route( ...arguments )
      }
    }
  }
)
