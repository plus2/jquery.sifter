
# Filter list plugin, used for the facets

(($) ->

  $.fn.extend
    facetList: (opts) ->
      return this.each () ->
        el = $(@)
        el.data("facetList", new FacetList(el, opts))


  callback = (name,args) ->
    fn = if $.isFunction(name)
          name
         else if $.isFunction(@opts[name])
           @opts[name]

    if fn
      args = slice.call(arguments, 2)
      fn.apply(@,args)


  class FacetList
    callback: callback

    defaults:
      selector: 'li a'
      groupedBy: 'ul'
      clearFiltersSelector: '.clear-filters'
      useHeadingTogglers: false
      headingSelector: 'h5 a'
      filterTypeRegexp: /^(\w+)\-/
      beforeUpdate: null
      afterSetup: null
      afterClear: null


    $: (selector) ->
      @container.find(selector)


    constructor: (el,opts) ->
      @opts = $.extend true, {}, @defaults, opts

      # Container should be a UL with child LIs containing their own
      # UL with child LI filters
      @container = $(el)

      # Note that it's setup
      @container.addClass("isFilterList")

      # Find the filter groups
      @groups = @container.find(@opts.groupedBy)

      # Work on the filters themselves
      @filters = @$("#{@opts.selector}:not(.ignore)")
      @setupFilters()

      # Set up clear filter link
      $(@opts.clearFiltersSelector).live 'click keypress', @clearFilters

      # Update what filters are active upon changes
      @container.bind "fl:activate fl:deactivate", @updateActiveFilters

      # We may want to use the filter headings to toggle visibility
      @setupHeadingTogglers()

      if $.isFunction(@opts.afterSetup)
        @opts.afterSetup.apply @


    setupFilters: () ->
      # Bind to the user's events and some custom ones too
      @filters.live 'click keypress', (e) ->
        f = $(@)

        # Check if this is a standard filter or a radio
        if f.hasClass('radio')

          # If this is a radio filter:
          # - activate if inactive, and deactivate all others in the radio group
          # - ignore if active
          unless f.hasClass('active')

            # Find the other active in this radio group and deactivate
            # True here so we don't have 2 renders occurring, we'll just use the 2nd
            f.parent().parent().find('.radio.active').trigger('fl:deactivate', true)

            # Activate this one
            f.trigger('fl:activate')

        else

          # If this is a standard filter, toggle between active and inactive
          f.trigger if f.hasClass('active') then 'fl:deactivate' else 'fl:activate'

        e.preventDefault()

      .live('fl:activate', @activateFilter)
      .live('fl:deactivate', @deactivateFilter)



    updateActiveFilters: (e, noUpdate) =>
      # Callback
      @callback 'beforeUpdate'

      # Find all active filters and store data about them on the container
      activeFilters = @filters.filter('.active')
      grouped = {}
      active = []

      # Group by type into an object
      activeFilters.each (i,el) =>
        el = $(el)

        if id = el.attr('id')
          if type = id.match(@opts.filterTypeRegexp)
            grouped[type] = [] unless $.isArray(grouped[type])

            grouped[type].push(id)

      # Turn the above collection into an array of arrays
      $.each grouped, (k, v) ->
        active.push(v)

      # Unless we've supplied event data requesting that this be ignored
      unless noUpdate
        # Emit that this happened
        @container.trigger "fl:filtersUpdated", [@, active]


    clearFilters: () =>
      @deactivateAll()
      @updateActiveFilters()
      @callback 'afterClear'

      false


    deactivateAll: () ->
      @filters.filter(':not(.radio)').removeClass('active')


    deactivateFilter: () ->
      $(@).removeClass('active')


    activateFilter: (e) ->
      $(@).addClass('active')


    setupHeadingTogglers: () ->
      if @opts.useHeadingTogglers
        @container.find(@opts.headingSelector).each (el) =>
          header = $(el)

          # The parent should be the parent of both the header and the filters in this category
          header.parent().parent()
            .data('active', true)
            .addClass('active')
          header.bind "click keypress", () ->
            parent = header.parent().parent()
            parent
              .toggleClass('active')
              .data('active', !(parent.data('active')))




  # Filtered list plugin, used on results table
  $.fn.extend
    filteredList: (opts) ->
      return this.each () ->
        el = $(@)
        el.data("filteredList", new FilteredList(el, opts))


  class FilteredList
    callback: callback

    defaults:
      filteredSelector: 'tbody > tr'
      afterSetup: null
      afterRender: null
      beforeRender: null
      activateOnSetup: true
      siblings: true


    constructor: (el,opts) ->
      @opts      = $.extend true, {}, @defaults, opts
      @container = $(el)  # This will probably be a table

      # Set this up
      $.data(@container, 'activeFilters', {})

      # Note that it's filtered
      @container.addClass("filtered")

      # Setup the rows
      @cacheFiltered()
      @parent = $(@filtered.first()).parent()
      @setupFiltered()

      # Bind the custom render method
      @container.bind("fl:render", @render)

      @callback 'afterSetup'


    setupFiltered: () ->
      @filtered
        .live("fl:activate", @activateItem)
        .live("fl:deactivate", @deactivateItem)

      if @opts.activateOnSetup
        # Visible by default, so let's make sure
        @activateAll()


    cacheFiltered: () ->
      @filtered = $(@opts.filteredSelector, @container).filter(':not(.empty-message)')

      # If the filtered items aren't siblings, we're going to keep track of each one's parent
      unless @opts.siblings
        @filtered.each () ->
          item = $(@)
          # Find this item's parent and store a reference to it in data
          item.data('parent', item.parent())


    # Puts a collection of items back into the DOM
    putBack: (collection) ->
      collection = collection || @filtered; # If a collection isn't supplied, use filtered

      # If the items are siblings, just chuck them in together under the parent
      # Otherwise, each one needs to be placed under its original parent
      if @opts.siblings
        collection.appendTo(@parent)
      else
        collection.each () ->
          item = $(@)
          item.data('parent').append(item)


    activateAll: () ->
      @filtered
        .detach()
        .addClass('active')
      @putBack()


    deactivateAll: () ->
      @filtered
        .detach()
        .removeClass('active')
      @putBack()


    activateItem: () ->
      $(@).addClass('active')


    deactivateItem: () ->
      $(@).removeClass('active')


    render: () =>

      # Expensive. Queue it.
      $(document)
        .queue 'sifter', () =>
          run_render = () =>
            if @hasActiveFilters()
              rows = detached = @filtered.detach() # Detach and make a copy of filtered

              # Loop through all filter groups. 
              $.each @getActive(), () ->
                if $.isArray(@) # 'this' is an array of class names.
                  selector = '.' + @.join(',.') # Selector for the filters
                  rows = rows.filter(selector); # Reduce stored rows by selector

                else if $.isFunction(@) # 'this' is 
                  rows = $( $.grep( rows.get(), @ ) )


              # Make rows unique and then activate those that remain
              els = rows.get()
              detached.each () ->
                el = $(@)
                if $.inArray(@, els) >= 0
                  unless el.hasClass('active')
                    el.addClass('active')

                else
                  if el.hasClass('active')
                    el.removeClass('active')


              # Add back into the dom
              @putBack(detached)

            else

              # If no filters are set, we're going to ensure everything is active
              @activateAll()


            # Run after callback
            @callback 'afterRender'


          # Run before callback
          if $.isFunction(@opts.beforeRender)
            @opts.beforeRender.apply(@, [run_render])
          else
            run_render()

          $(@).dequeue('sifter')

        .delay(100, 'sifter')
        .dequeue('sifter')


    hasActiveFilters: () ->
      active = @getActive()
      $.isArray(active) && active.length > 0


    hasContents: () ->
      @filtered.length > 0


    setActiveFilters: (filters) ->
      @setActiveFiltersFromSource(filters,'*')


    setActiveFiltersFromSource: (filters,source) ->
      filtersBySource = $.data(@container, 'activeFilters') || {}

      # valid filters get keyed by source. That is to say, a source only has one set of active filters.
      if ($.isArray(filters) || $.isFunction(filters))
        filtersBySource[source] = filters

        $.data(@container, 'activeFilters', filtersBySource)
        @container.trigger("fl:render")

      else if (filters == null)
        delete filtersBySource[source]

        $.data(@container, 'activeFilters', filtersBySource)
        @container.trigger("fl:render")



    getActive: () ->
      filters = $.data(@container, 'activeFilters')
      flatFilters = []

      # filters from all sources are merged into a single array.
      if $.isPlainObject(filters)
        $.each filters, (k,value) ->
          if ($.isArray(value))
            $.merge(flatFilters,value)
          else
            flatFilters.push(value)

        flatFilters
      else
        []





# Sifter plugin, using both of the above plugins

  $.fn.extend
    sifter: (opts) ->
      return @each () ->
        el = $(@)
        el.data("sifter", new SifterClassic(el, opts))


  class Sifter
    callback: callback

    @defaults:
      facetList: '#facetList'
      filteredList: '#filteredList'

      filterUpdateEvent: 'fl:filtersUpdated'

      facetListOpts: {}
      filteredListOpts: {}

      afterSetup: null


    constructor: (el,opts) ->
      @opts = $.extend true, {}, Sifter.defaults, opts

      # Store some key elements
      @container = $(el)

      @filteredList = @container.find(@opts.filteredList)

      # Set up the plugins
      # We're queueing these because it can get slow when dealing 
      # with a lot of data
      @filteredList.filteredList(@opts.filteredListOpts)

      # Trigger callback
      @callback 'afterSetup'


  class SifterClassic extends Sifter

    @defaults:
      facetList: '#filterList'

    constructor: (el,opts) ->
      @opts = $.extend true, {}, SifterClassic.defaults, opts

      # delay afterSetup until after this outer constructor
      setupCallback    = opts.afterSetup
      opts.afterSetup = null

      super(el,@opts)

      @facetList    = @container.find(@opts.facetList)
      @facetList.facetList(@opts.facetListOpts)

      # When we hear this event, we're going to work
      @container.bind(@opts.filterUpdateEvent, @applyActiveFilters)

      @callback setupCallback



    # Move the active filter list filters to the filtered list
    applyActiveFilters: (event, source, activeFilters) =>
      # Make sure that we have results to filter
      fl = @filteredList.data('filteredList')
      if $.isArray(activeFilters) && fl.hasContents()
        # Delay this too
        $(document)
          .queue 'sifter', () =>
            fl.setActiveFiltersFromSource(activeFilters, source)
            $(document).dequeue('sifter')

          .dequeue('sifter')

)(jQuery)
