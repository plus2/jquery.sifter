
# Filter list plugin, used for the facets

(($) ->

  $.fn.extend
    facets: (opts) ->
      # destroy existing instance
      if instance = @data("facets")
        @removeData("facets")

      # selector is a form
      return this.each () ->
        el = $(@)
        instance = new Facets(el, opts)
        el.data("facets", instance)


  class Facets

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
      $(selector,@)


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
      @filters = @$("#{@opts.selector} :not(.ignore)")
      @setupFilters()

      _.bindAll @, 'clearFilters', 'updateActiveFilters'

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
      filters.live 'click keypress', (e) ->
        f = $(@)

        # Check if this is a standard filter or a radio
        if f.hasClass('radio')

          # If this is a radio filter:
          # - activate if inactive, and deactivate all others in the radio group
          # - ignore if active
          if f.hasClass('active')

            # Find the other active in this radio group and deactivate
            # True here so we don't have 2 renders occurring, we'll just use the 2nd
            f.parent().parent().find('.radio.active').trigger('fl:deactivate', true)

            # Activate this one
            f.trigger('fl:activate')

        else

          # If this is a standard filter, toggle between active and inactive
          f.trigger f.hasClass('active') ? 'fl:deactivate' : 'fl:activate'

        e.preventDefault()

      .live('fl:activate', @activateFilter)
      .live('fl:deactivate', @deactivateFilter)



    updateActiveFilters: (e, noUpdate) ->
      # Callback
      if $.isFunction(@opts.beforeUpdate)
        @opts.beforeUpdate.apply(@)

      # Find all active filters and store data about them on the container
      activeFilters = @filters.filter('.active')
      grouped = {}
      active = []

      # Group by type into an object
      activeFilters.each (el) =>
        el = $(el)

        if id = el.attr('id')
          if type = id.match(@opts.filterTypeRegexp)
            unless $.isArray(grouped[type])
              grouped[type] = []

            grouped[type].push(id)

      # Turn the above collection into an array of arrays
      $.each grouped, (k, v) ->
        active.push(v)

      # Unless we've supplied event data requesting that this be ignored
      unless noUpdate
        # Emit that this happened
        container.trigger "fl:filtersUpdated", [@, active]


    clearFilters: () ->
      @deactivateAll()
      @updateActiveFilters()
      if $.isFunction(@opts.afterClear)
        @opts.afterClear.apply(@container)

      false


    deactivateAll: () ->
      @filters.filter(':not(.radio)').removeClass('active')


    deactivateFilter: () ->
      $(@).removeClass('active')


    activateFilter: () ->
      $(@).addClass('active')


    setupHeadingTogglers: () ->
      if @opts.useHeadingTogglers
        @container.find(opts.headingSelector).each (el) =>
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
      # destroy existing instance
      if instance = @data("filteredList")
        @removeData("filteredList")

      # selector is a form
      return this.each () ->
        el = $(@)
        instance = new FilteredList(el, opts)
        el.data("filteredList", instance)


  class FilteredList

    defaults:
      filteredSelector: 'tbody > tr'
      afterSetup: null
      afterRender: null
      beforeRender: null
      activateOnSetup: true
      siblings: true


    constructor: (el,opts) ->
      @opts = $.extend true, {}, @defaults, opts

      @container = $(@)  # This will probably be a table

      # Set this up
      # XXX
      $.data(container, 'activeFilters', {})

      # Note that it's filtered
      @container.addClass("filtered")

      # Setup the rows
      @cacheFiltered()
      @parent = $(@filtered.first()).parent()
      @setupFiltered()

      # Bind the custom render method
      _.bindAll @, 'render' # XXX bindAll
      @container.bind("fl:render", @render)

      if $.isFunction(@opts.afterSetup)
        @opts.afterSetup.apply(@)


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
      filtered
        .detach()
        .addClass('active')
      @putBack()


    deactivateAll: () ->
      filtered
        .detach()
        .removeClass('active')
      @putBack()


    activateItem: () ->
      $(@).addClass('active')


    deactivateItem: () ->
      $(@).removeClass('active')


    render: () ->
      # Expensive. Queue it.
      $(document)
        .queue 'sifter', () ->
          run_render = () ->
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
            if $.isFunction(@opts.afterRender)
              @opts.afterRender.apply(@)


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

    #$.fn.extend
      #sifter: (options) ->
        #opts = $.extend(true, {}, $.fn.sifter.defaults, options)
        #this.each(setup)

  class Sifter

    defaults:
      filterList: '#filterList'
      filteredList: '#filteredList'
      filterUpdateEvent: 'fl:filtersUpdated'
      filterListOpts: {}
      filteredListOpts: {}
      afterSetup: null


    constructor: () ->
      # Store some key elements
      container = $(@)
      filteredList = container.find(opts.filteredList)
      filterList = container.find(opts.filterList)

      # Set up the plugins
      # We're queueing these because it can get slow when dealing 
      # with a lot of data
      filteredList.filteredList(opts.filteredListOpts)
      filterList.filterList(opts.filterListOpts)

      # When we hear this event, we're going to work
      container.bind(opts.filterUpdateEvent, applyActiveFilters)

      # Trigger callback
      if ($.isFunction(opts.afterSetup))
        opts.afterSetup.apply(container)


    # Move the active filter list filters to the filtered list
    applyActiveFilters: (event, source, activeFilters) ->
      # Make sure that we have results to filter
      if ($.isArray(activeFilters) && filteredList.hasContents() == true)
        # Delay this too
        $(document)
          .queue 'sifter', () ->
            filteredList.setActiveFiltersFromSource(activeFilters,source)
            $(@).dequeue('sifter')

          .dequeue('sifter')

)(jQuery)
