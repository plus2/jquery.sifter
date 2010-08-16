# Sifter

Sifter is a jQuery plugin that can be used to implement client&ndash;side [faceted search](http://en.wikipedia.org/wiki/Faceted_search "More info on faceted search on Wikipedia").

## Usage

Each facet (a.k.a. filter) has an ID. Any filtered item (i.e. search result) that is relevant to a particular filter uses that filter's ID as a class.

### Example

_You can find a functioning version of this example in the examples/ directory in this repository._

Your markup looks like this:

    <div>
      <ul id="filterList">
        <li>
          <h3>Size</h3>
          <ul>
            <li><a href="#" id="size-big">Big</a></li>
            <li><a href="#" id="size-medium">Medium</a></li>
            <li><a href="#" id="size-small">Small</a></li>
          </ul>
        </li>
        <li>
          <h3>Type</h3>
          <ul>
            <li><a href="#" id="type-animate">Animate</a></li>
            <li><a href="#" id="type-inanimate">Inanimate</a></li>
          </ul>
        </li>
      </ul>
      <a href="#" class="clear-filters">Clear filters</a>
      <ul id="filteredList">
        <li class="type-inanimate size-big">House</li>
        <li class="type-inanimate size-medium">Car</li>
        <li class="type-animate size-small">Mouse</li>
        <li class="type-inanimate size-big">Ship</li>
        <li class="type-animate size-medium">Cat</li>
        <li class="type-animate size-small">Toadstool</li>
      </ul>
    </div>

Add some CSS. You only want relevant items visible and you also want to highlight active filters:

    <style>
      #filterList .active {font-weight:bold}
      #filteredList li {display:none}
      #filteredList li.active {display:block}
    </style>

The required JavaScript:

    <script src="jquery-1.4.2.min.js"></script>
    <script src="jquery.sifter.js"></script>
    <script>
      $(function() {
        $('div').sifter({
          filteredListOpts: {
            filteredSelector: 'li'
          }
        });
      });
    </script>

## Requirements

* jQuery (tested with 1.4.2)

## Contributors

* Dylan Fogarty-MacDonald
* Matt Allen

## Copyright

Copyright &copy; 2010 Plus2. See LICENSE for details.
