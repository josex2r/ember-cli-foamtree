window.addEventListener('load', function () {
  Tooltip.init();

  var zoomOutDisabled = true;

  var treemap = new CarrotSearchFoamTree({
    id: 'treemap',
    layout: 'ordered',
    stacking: 'flattened',
    maxGroupLevelsDrawn: Number.MAX_VALUE,
    maxGroupLabelLevelsDrawn: Number.MAX_VALUE,
    relaxationInitializer: 'ordered',

    // Increase the relaxation quality threshold a little for
    // faster processing at the cost of slightly lower layout quality.
    relaxationVisible: true,
    relaxationMaxDuration: 2000,
    relaxationQualityThreshold: 6,

      // Remove restriction on the minimum group diameter, so that
    // we can render as many diagram levels as possible.
    groupMinDiameter: 0,

    // Lower the minimum label font size a bit to show more labels.
    groupLabelMinFontSize: 3,

    // Lower the border radius a bit to fit more groups.
    groupBorderWidth: 2,
    groupInsetWidth: 3,
    groupSelectionOutlineWidth: 1,

    // Always draw group labels, this will make zooming more attractive.
    wireframeLabelDrawing: "always",

    // You can change how many levels of polygons and labels below
    // each topmost closed group FoamTree will draw. Lower values will
    // result in faster rendering, but also less detail "underneath" the closed groups.
    //maxGroupLevelsDrawn: 4,
    //maxGroupLabelLevelsDrawn: 3,

    // Disable rounded corners, deeply-nested groups
    // will look much better and render faster.
    groupBorderRadius: 0,

      // Lower the parent group opacity, so that lower-level groups show through.
    parentFillOpacity: 0.5,

    groupLabelVerticalPadding: 0.2,
    // Disable rollout and pullback animations, use simple fading
    rolloutDuration: 0,
    pullbackDuration: 0,
    fadeDuration: 0,
    dataObject: {
      groups: window.data
    },

    titleBarDecorator: function (opts, props, vars) {
      vars.titleBarShown = false;
    },

    onGroupClick: function (event) {
      preventDefault(event);
      zoomOutDisabled = false;
      treemap.zoom(event.group);
    },

    onGroupDoubleClick: preventDefault,

    onGroupHover: function (event) {
      var group = event.group;

      if (group) {
        Tooltip.show(
          '<b>' + group.label + '</b><br>' +
          (group.parsedSize === undefined ? '' : '<br>Parsed size: <b>' + filesize(group.parsedSize) + '</b>') +
          '<br>Stat size: <b>' + group.weight + '</b>' +
          (group.path ? '<br>Path: <b>' + group.path + '</b>' : '')
        );
      } else {
        Tooltip.hide();
      }
    },

    onGroupMouseWheel: function (event) {
      var isZoomOut = (event.delta < 0);

      if (isZoomOut) {
        if (zoomOutDisabled) return preventDefault(event);

        if (this.get('viewport').scale < 1) {
          zoomOutDisabled = true;
          preventDefault(event);
        }
      } else {
        zoomOutDisabled = false;
      }
    }
  });

  window.addEventListener('resize', treemap.resize);

  function preventDefault(event) {
    event.preventDefault();
  }
}, false);
