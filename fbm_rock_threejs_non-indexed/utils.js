function rand_range(min, max) {
  return Math.random() * (max - min) + min;
}

function rand_int(min ,max) {
  return Math.floor((Math.random() * (max - min)) + min);
}

// renamed lerp so it doesn't clash with other functions used elsewhere
function blerp(start, end, amt){
  return (1 - amt) * start + amt * end;
}


function mergeVertices(geometry, tolerance = 1e-4) {
  tolerance = Math.max(tolerance, Number.EPSILON);

  // Generate an index buffer if the geometry doesn't have one, or optimize it
  // if it's already available.
  var hashToIndex = {};
  var indices = geometry.getIndex();
  var positions = geometry.getAttribute("position");
  var vertexCount = indices ? indices.count : positions.count;

  // next value for triangle indices
  var nextIndex = 0;

  // attributes and new attribute arrays
  var attributeNames = Object.keys(geometry.attributes);
  var attrArrays = {};
  var morphAttrsArrays = {};
  var newIndices = [];
  var getters = ["getX", "getY", "getZ", "getW"];

  // initialize the arrays
  for (var i = 0, l = attributeNames.length; i < l; i++) {
    var name = attributeNames[i];

    attrArrays[name] = [];

    var morphAttr = geometry.morphAttributes[name];
    if (morphAttr) {
      morphAttrsArrays[name] = new Array(morphAttr.length).fill().map(() => []);
    }
  }

  // convert the error tolerance to an amount of decimal places to truncate to
  var decimalShift = Math.log10(1 / tolerance);
  var shiftMultiplier = Math.pow(10, decimalShift);
  for (var i = 0; i < vertexCount; i++) {
    var index = indices ? indices.getX(i) : i;

    // Generate a hash for the vertex attributes at the current index 'i'
    var hash = "";
    for (var j = 0, l = attributeNames.length; j < l; j++) {
      var name = attributeNames[j];
      var attribute = geometry.getAttribute(name);
      var itemSize = attribute.itemSize;

      for (var k = 0; k < itemSize; k++) {
        // double tilde truncates the decimal value
        hash += `${~~(attribute[getters[k]](index) * shiftMultiplier)},`;
      }
    }

    // Add another reference to the vertex if it's already
    // used by another index
    if (hash in hashToIndex) {
      newIndices.push(hashToIndex[hash]);
    } else {
      // copy data to the new index in the attribute arrays
      for (var j = 0, l = attributeNames.length; j < l; j++) {
        var name = attributeNames[j];
        var attribute = geometry.getAttribute(name);
        var morphAttr = geometry.morphAttributes[name];
        var itemSize = attribute.itemSize;
        var newarray = attrArrays[name];
        var newMorphArrays = morphAttrsArrays[name];

        for (var k = 0; k < itemSize; k++) {
          var getterFunc = getters[k];
          newarray.push(attribute[getterFunc](index));

          if (morphAttr) {
            for (var m = 0, ml = morphAttr.length; m < ml; m++) {
              newMorphArrays[m].push(morphAttr[m][getterFunc](index));
            }
          }
        }
      }

      hashToIndex[hash] = nextIndex;
      newIndices.push(nextIndex);
      nextIndex++;
    }
  }

  // Generate typed arrays from new attribute arrays and update
  // the attributeBuffers
  const result = geometry.clone();
  for (var i = 0, l = attributeNames.length; i < l; i++) {
    var name = attributeNames[i];
    var oldAttribute = geometry.getAttribute(name);

    var buffer = new oldAttribute.array.constructor(attrArrays[name]);
    var attribute = new THREE.BufferAttribute(
      buffer,
      oldAttribute.itemSize,
      oldAttribute.normalized
    );

    result.setAttribute(name, attribute);

    // Update the attribute arrays
    if (name in morphAttrsArrays) {
      for (var j = 0; j < morphAttrsArrays[name].length; j++) {
        var oldMorphAttribute = geometry.morphAttributes[name][j];

        var buffer = new oldMorphAttribute.array.constructor(
          morphAttrsArrays[name][j]
        );
        var morphAttribute = new THREE.BufferAttribute(
          buffer,
          oldMorphAttribute.itemSize,
          oldMorphAttribute.normalized
        );
        result.morphAttributes[name][j] = morphAttribute;
      }
    }
  }

  // indices

  result.setIndex(newIndices);

  return result;
}




// from: https://gist.github.com/danallison/3ec9d5314788b337b682

function downloadString(text, fileType, fileName) {
  var blob = new Blob([text], { type: fileType });

  var a = document.createElement('a');
  a.download = fileName;
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 5000); // last parameter is timeout in mms
}

