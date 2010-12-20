(function() {
  var __bind = function(func, context) {
    return function(){ return func.apply(context, arguments); };
  };
  (function($) {
    var FacetList, FilteredList, Sifter, callback;
    callback = function(name, args) {
      var fn;
      fn = (function() {
        if ($.isFunction(name)) {
          return name;
        } else if ($.isFunction(this.opts[name])) {
          return this.opts[name];
        }
      }).call(this);
      if (fn) {
        args = slice.call(arguments, 2);
        return fn.apply(this, args);
      }
    };
    $.fn.extend({
      facetList: function(opts) {
        return this.each(function() {
          var el;
          el = $(this);
          return el.data("facetList", new FacetList(el, opts));
        });
      }
    });
    FacetList = function(el, opts) {
      var _this;
      _this = this;
      this.clearFilters = function(){ return FacetList.prototype.clearFilters.apply(_this, arguments); };
      this.updateActiveFilters = function(){ return FacetList.prototype.updateActiveFilters.apply(_this, arguments); };
      this.opts = $.extend(true, {}, this.defaults, opts);
      this.container = $(el);
      this.container.addClass("isFilterList");
      this.groups = this.container.find(this.opts.groupedBy);
      this.filters = this.$("" + (this.opts.selector) + ":not(.ignore)");
      this.setupFilters();
      $(this.opts.clearFiltersSelector).live('click keypress', this.clearFilters);
      this.container.bind("fl:activate fl:deactivate", this.updateActiveFilters);
      this.setupHeadingTogglers();
      if ($.isFunction(this.opts.afterSetup)) {
        this.opts.afterSetup.apply(this);
      }
      return this;
    };
    FacetList.prototype.callback = callback;
    FacetList.prototype.defaults = {
      selector: 'li a',
      groupedBy: 'ul',
      clearFiltersSelector: '.clear-filters',
      useHeadingTogglers: false,
      headingSelector: 'h5 a',
      filterTypeRegexp: /^(\w+)\-/,
      beforeUpdate: null,
      afterSetup: null,
      afterClear: null
    };
    FacetList.prototype.$ = function(selector) {
      return this.container.find(selector);
    };
    FacetList.prototype.setupFilters = function() {
      return this.filters.live('click keypress', function(e) {
        var f;
        f = $(this);
        if (f.hasClass('radio')) {
          if (!(f.hasClass('active'))) {
            f.parent().parent().find('.radio.active').trigger('fl:deactivate', true);
            f.trigger('fl:activate');
          }
        } else {
          f.trigger(f.hasClass('active') ? 'fl:deactivate' : 'fl:activate');
        }
        return e.preventDefault();
      }).live('fl:activate', this.activateFilter).live('fl:deactivate', this.deactivateFilter);
    };
    FacetList.prototype.updateActiveFilters = function(e, noUpdate) {
      var active, activeFilters, grouped;
      this.callback('beforeUpdate');
      activeFilters = this.filters.filter('.active');
      grouped = {};
      active = [];
      activeFilters.each(__bind(function(i, el) {
        var id, type;
        el = $(el);
        if (id = el.attr('id')) {
          if (type = id.match(this.opts.filterTypeRegexp)) {
            if (!($.isArray(grouped[type]))) {
              grouped[type] = [];
            }
            return grouped[type].push(id);
          }
        }
      }, this));
      $.each(grouped, function(k, v) {
        return active.push(v);
      });
      return !(noUpdate) ? this.container.trigger("fl:filtersUpdated", [this, active]) : null;
    };
    FacetList.prototype.clearFilters = function() {
      this.deactivateAll();
      this.updateActiveFilters();
      this.callback('afterClear');
      return false;
    };
    FacetList.prototype.deactivateAll = function() {
      return this.filters.filter(':not(.radio)').removeClass('active');
    };
    FacetList.prototype.deactivateFilter = function() {
      return $(this).removeClass('active');
    };
    FacetList.prototype.activateFilter = function(e) {
      return $(this).addClass('active');
    };
    FacetList.prototype.setupHeadingTogglers = function() {
      return this.opts.useHeadingTogglers ? this.container.find(this.opts.headingSelector).each(__bind(function(el) {
        var header;
        header = $(el);
        header.parent().parent().data('active', true).addClass('active');
        return header.bind("click keypress", function() {
          var parent;
          parent = header.parent().parent();
          return parent.toggleClass('active').data('active', !(parent.data('active')));
        });
      }, this)) : null;
    };
    $.fn.extend({
      filteredList: function(opts) {
        return this.each(function() {
          var el;
          el = $(this);
          return el.data("filteredList", new FilteredList(el, opts));
        });
      }
    });
    FilteredList = function(el, opts) {
      var _this;
      _this = this;
      this.render = function(){ return FilteredList.prototype.render.apply(_this, arguments); };
      this.opts = $.extend(true, {}, this.defaults, opts);
      this.container = $(el);
      $.data(this.container, 'activeFilters', {});
      this.container.addClass("filtered");
      this.cacheFiltered();
      this.parent = $(this.filtered.first()).parent();
      this.setupFiltered();
      this.container.bind("fl:render", this.render);
      this.callback('afterSetup');
      return this;
    };
    FilteredList.prototype.callback = callback;
    FilteredList.prototype.defaults = {
      filteredSelector: 'tbody > tr',
      afterSetup: null,
      afterRender: null,
      beforeRender: null,
      activateOnSetup: true,
      siblings: true
    };
    FilteredList.prototype.setupFiltered = function() {
      this.filtered.live("fl:activate", this.activateItem).live("fl:deactivate", this.deactivateItem);
      return this.opts.activateOnSetup ? this.activateAll() : null;
    };
    FilteredList.prototype.cacheFiltered = function() {
      this.filtered = $(this.opts.filteredSelector, this.container).filter(':not(.empty-message)');
      return !(this.opts.siblings) ? this.filtered.each(function() {
        var item;
        item = $(this);
        return item.data('parent', item.parent());
      }) : null;
    };
    FilteredList.prototype.putBack = function(collection) {
      collection = collection || this.filtered;
      return this.opts.siblings ? collection.appendTo(this.parent) : collection.each(function() {
        var item;
        item = $(this);
        return item.data('parent').append(item);
      });
    };
    FilteredList.prototype.activateAll = function() {
      this.filtered.detach().addClass('active');
      return this.putBack();
    };
    FilteredList.prototype.deactivateAll = function() {
      this.filtered.detach().removeClass('active');
      return this.putBack();
    };
    FilteredList.prototype.activateItem = function() {
      return $(this).addClass('active');
    };
    FilteredList.prototype.deactivateItem = function() {
      return $(this).removeClass('active');
    };
    FilteredList.prototype.render = function() {
      return $(document).queue('sifter', __bind(function() {
        var run_render;
        run_render = __bind(function() {
          var detached, els, rows;
          if (this.hasActiveFilters()) {
            rows = (detached = this.filtered.detach());
            $.each(this.getActive(), function() {
              var selector;
              if ($.isArray(this)) {
                selector = '.' + this.join(',.');
                return (rows = rows.filter(selector));
              } else if ($.isFunction(this)) {
                return (rows = $($.grep(rows.get(), this)));
              }
            });
            els = rows.get();
            detached.each(function() {
              var el;
              el = $(this);
              return $.inArray(this, els) >= 0 ? (!(el.hasClass('active')) ? el.addClass('active') : null) : (el.hasClass('active') ? el.removeClass('active') : null);
            });
            this.putBack(detached);
          } else {
            this.activateAll();
          }
          return this.callback('afterRender');
        }, this);
        if ($.isFunction(this.opts.beforeRender)) {
          this.opts.beforeRender.apply(this, [run_render]);
        } else {
          run_render();
        }
        return $(this).dequeue('sifter');
      }, this)).delay(100, 'sifter').dequeue('sifter');
    };
    FilteredList.prototype.hasActiveFilters = function() {
      var active;
      active = this.getActive();
      return $.isArray(active) && active.length > 0;
    };
    FilteredList.prototype.hasContents = function() {
      return this.filtered.length > 0;
    };
    FilteredList.prototype.setActiveFilters = function(filters) {
      return this.setActiveFiltersFromSource(filters, '*');
    };
    FilteredList.prototype.setActiveFiltersFromSource = function(filters, source) {
      if (!($.isArray(filters) && this.hasContents())) {
        return null;
      }
      return $(document).queue('sifter', __bind(function() {
        this.immediatelySetActiveFiltersFromSource(filters, source);
        return $(document).dequeue('sifter');
      }, this)).dequeue('sifter');
    };
    FilteredList.prototype.immediatelySetActiveFiltersFromSource = function(filters, source) {
      var filtersBySource, updated;
      filtersBySource = $.data(this.container, 'activeFilters') || {};
      if ($.isArray(filters) || $.isFunction(filters)) {
        filtersBySource[source] = filters;
        updated = true;
      } else if (filters === null) {
        delete filtersBySource[source];
        updated = true;
      }
      if (updated) {
        $.data(this.container, 'activeFilters', filtersBySource);
        return this.container.trigger("fl:render");
      }
    };
    FilteredList.prototype.getActive = function() {
      var filters, flatFilters;
      filters = $.data(this.container, 'activeFilters');
      flatFilters = [];
      if ($.isPlainObject(filters)) {
        $.each(filters, function(k, value) {
          return ($.isArray(value)) ? $.merge(flatFilters, value) : flatFilters.push(value);
        });
        return flatFilters;
      } else {
        return [];
      }
    };
    $.fn.extend({
      sifter: function(opts) {
        return this.each(function() {
          var el;
          el = $(this);
          return el.data("sifter", new Sifter(el, opts));
        });
      }
    });
    Sifter = function(el, opts) {
      var _this;
      _this = this;
      this.applyActiveFilters = function(){ return Sifter.prototype.applyActiveFilters.apply(_this, arguments); };
      this.opts = $.extend(true, {}, Sifter.defaults, opts);
      this.container = $(el);
      this.filteredListEl = this.container.find(this.opts.filteredList);
      this.filteredListEl.filteredList(this.opts.filteredListOpts);
      this.filteredList = this.filteredListEl.data('filteredList');
      this.facetListEl = this.container.find(this.opts.facetList);
      this.facetListEl.facetList(this.opts.facetListOpts);
      this.facetList = this.facetListEl.data('facetList');
      this.container.bind(this.opts.filterUpdateEvent, this.applyActiveFilters);
      this.callback('afterSetup');
      return this;
    };
    Sifter.prototype.callback = callback;
    Sifter.defaults = {
      facetList: '#facetList',
      filteredList: '#filteredList',
      filterUpdateEvent: 'fl:filtersUpdated',
      facetListOpts: {},
      filteredListOpts: {},
      afterSetup: null
    };
    Sifter.prototype.applyActiveFilters = function(event, source, activeFilters) {
      return this.filteredList.setActiveFiltersFromSource(activeFilters, source);
    };
    return Sifter;
  })(jQuery);
}).call(this);
