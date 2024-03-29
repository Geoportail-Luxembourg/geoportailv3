/**
 * @module ngeo.misc.sortableComponent
 */
import 'jquery-ui/ui/widgets/sortable.js';
import 'jquery-ui-touch-punch';
import googAsserts from 'goog/asserts.js';

/**
 * @type {!angular.Module}
 */
const exports = angular.module('ngeoSortable', []);


/**
 * Provides a directive that allows drag-and-dropping DOM items between them.
 * It also changes the order of elements in the given array.
 *
 * It is typically used together with `ng-repeat`, for example for re-ordering
 * layers in a map.
 *
 * Example:
 *
 *     <ul ngeo-sortable="ctrl.layers"
 *         ngeo-sortable-options="{handleClassName: 'ngeo-sortable-handle'}">
 *       <li ng-repeat="layer in ctrl.layers">
 *         <span class="ngeo-sortable-handle">handle</span>{{layer.get('name')}}
 *       </li>
 *     </ul>
 *
 * The value of the "ngeo-sortable" attribute is an expression which evaluates
 * to an array (an array of layers in the above example). This is the array
 * that is re-ordered after a drag-and-drop.
 *
 * The element with the class "ngeo-sortable-handle" is the "drag handle".
 * It is required.
 *
 * This directives uses `$watchCollection` to watch the "sortable" array. So
 * if some outside code adds/removes elements to/from the "sortable" array,
 * the "ngeoSortable" directive will pick it up.
 *
 * See our live example: [../examples/layerorder.html](../examples/layerorder.html)
 *
 * @htmlAttribute {Array.<ol.layer.Base>} ngeo-sortable The layers to sort.
 * @htmlAttribute {!ngeox.miscSortableOptions} ngeo-sortable-options The options.
 * @htmlAttribute {Function(angular.JQLite, Array)?} ngeo-sortable-callback
 *     Callback function called after the move end. The Function will be called
 *     with the element and the sort array as arguments.
 * @htmlAttribute {Object?} ngeo-sortable-callback-ctx Context to apply at
 *     the call of the callback function.
 * @param {angular.$timeout} $timeout Angular timeout service.
 * @return {angular.Directive} The directive specs.
 * @ngInject
 * @ngdoc directive
 * @ngname ngeoSortable
 */
exports.component_ = function($timeout) {
  return {
    restrict: 'A',
    /**
     * @param {angular.Scope} scope Scope.
     * @param {angular.JQLite} element Element.
     * @param {angular.Attributes} attrs Attributes.
     */
    link: (scope, element, attrs) => {

      const sortable = /** @type {Array} */
              (scope.$eval(attrs['ngeoSortable'])) || [];
      googAsserts.assert(Array.isArray(sortable));

      scope.$watchCollection(() => sortable, () => {
        sortable.length && $timeout(resetUpDragDrop, 0);
      });

      const optionsObject = scope.$eval(attrs['ngeoSortableOptions']);
      const options = getOptions(optionsObject);

      const callbackFn = scope.$eval(attrs['ngeoSortableCallback']);
      const callbackCtx = scope.$eval(attrs['ngeoSortableCallbackCtx']);

      /**
       * This function resets drag&drop for the list. It is called each
       * time the sortable array changes (see $watchCollection above).
       */
      function resetUpDragDrop() {
        // Add an index to the sortable to allow sorting of the
        // underlying data.
        const children = element.children();
        for (let i = 0; i < children.length; ++i) {
          angular.element(children[i]).data('idx', i);
        }

        const sortableElement = $(element);

        // the element is already sortable; reset it.
        if (sortableElement.data('ui-sortable')) {
          sortableElement.off('sortupdate');
          sortableElement.sortable('destroy');
        }

        const sortableOptions = {
          'axis': 'y',
          'classes': {
            'ui-sortable-helper': options['draggerClassName']
          }
        };

        // CSS class of the handle
        if (options['handleClassName']) {
          sortableOptions['handle'] = `.${options['handleClassName']}`;
        }

        // Placeholder for the item being dragged in the sortable list
        if (options['placeholderClassName']) {
          sortableOptions['placeholder'] = options['placeholderClassName'];
          sortableOptions['forcePlaceholderSize'] = true;
        }

        sortableElement.sortable(sortableOptions);

        // This event is triggered when the user stopped sorting and
        // the DOM position (i.e. order in the sortable list) has changed.
        sortableElement.on('sortupdate', (event, ui) => {
          const oldIndex = $(ui.item[0]).data('idx');
          const newIndex = ui.item.index();

          // Update (data)-index on dom element to its new position
          $(ui.item[0]).data('idx', newIndex);

          // Move dragged item to new position
          scope.$apply(() => {
            sortable.splice(newIndex, 0, sortable.splice(oldIndex, 1)[0]);
          });

          // Call the callback function if it exists.
          if (callbackFn instanceof Function) {
            callbackFn.apply(callbackCtx, [element, sortable]);
          }
        });
      }

      /**
       * @param {?} options Options after expression evaluation.
       * @return {!ngeox.miscSortableOptions} Options object.
       * @private
       */
      function getOptions(options) {
        let ret;
        const defaultHandleClassName = 'ngeo-sortable-handle';
        if (options === undefined) {
          ret = {'handleClassName': defaultHandleClassName};
        } else {
          if (options['handleClassName'] === undefined) {
            options['handleClassName'] = defaultHandleClassName;
          }
          ret = /** @type {ngeox.miscSortableOptions} */ (options);
        }
        return ret;
      }

    }
  };
};

exports.directive('ngeoSortable', exports.component_);


export default exports;
