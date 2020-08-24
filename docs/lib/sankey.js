var chart = (function (exports) {
  'use strict';

  var xhtml = "http://www.w3.org/1999/xhtml";

  var namespaces = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  function namespace(name) {
    var prefix = name += "", i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name; // eslint-disable-line no-prototype-builtins
  }

  function creatorInherit(name) {
    return function() {
      var document = this.ownerDocument,
          uri = this.namespaceURI;
      return uri === xhtml && document.documentElement.namespaceURI === xhtml
          ? document.createElement(name)
          : document.createElementNS(uri, name);
    };
  }

  function creatorFixed(fullname) {
    return function() {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }

  function creator(name) {
    var fullname = namespace(name);
    return (fullname.local
        ? creatorFixed
        : creatorInherit)(fullname);
  }

  function none() {}

  function selector(selector) {
    return selector == null ? none : function() {
      return this.querySelector(selector);
    };
  }

  function selection_select(select) {
    if (typeof select !== "function") select = selector(select);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function array(x) {
    return typeof x === "object" && "length" in x
      ? x // Array, TypedArray, NodeList, array-like
      : Array.from(x); // Map, Set, iterable, string, or anything else
  }

  function empty() {
    return [];
  }

  function selectorAll(selector) {
    return selector == null ? empty : function() {
      return this.querySelectorAll(selector);
    };
  }

  function arrayAll(select) {
    return function() {
      var group = select.apply(this, arguments);
      return group == null ? [] : array(group);
    };
  }

  function selection_selectAll(select) {
    if (typeof select === "function") select = arrayAll(select);
    else select = selectorAll(select);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          subgroups.push(select.call(node, node.__data__, i, group));
          parents.push(node);
        }
      }
    }

    return new Selection(subgroups, parents);
  }

  function matcher(selector) {
    return function() {
      return this.matches(selector);
    };
  }

  function childMatcher(selector) {
    return function(node) {
      return node.matches(selector);
    };
  }

  var find = Array.prototype.find;

  function childFind(match) {
    return function() {
      return find.call(this.children, match);
    };
  }

  function childFirst() {
    return this.firstElementChild;
  }

  function selection_selectChild(match) {
    return this.select(match == null ? childFirst
        : childFind(typeof match === "function" ? match : childMatcher(match)));
  }

  var filter = Array.prototype.filter;

  function children() {
    return this.children;
  }

  function childrenFilter(match) {
    return function() {
      return filter.call(this.children, match);
    };
  }

  function selection_selectChildren(match) {
    return this.selectAll(match == null ? children
        : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
  }

  function selection_filter(match) {
    if (typeof match !== "function") match = matcher(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function sparse(update) {
    return new Array(update.length);
  }

  function selection_enter() {
    return new Selection(this._enter || this._groups.map(sparse), this._parents);
  }

  function EnterNode(parent, datum) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum;
  }

  EnterNode.prototype = {
    constructor: EnterNode,
    appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
    insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
    querySelector: function(selector) { return this._parent.querySelector(selector); },
    querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
  };

  function constant(x) {
    return function() {
      return x;
    };
  }

  function bindIndex(parent, group, enter, update, exit, data) {
    var i = 0,
        node,
        groupLength = group.length,
        dataLength = data.length;

    // Put any non-null nodes that fit into update.
    // Put any null nodes into enter.
    // Put any remaining data into enter.
    for (; i < dataLength; ++i) {
      if (node = group[i]) {
        node.__data__ = data[i];
        update[i] = node;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }

    // Put any non-null nodes that don’t fit into exit.
    for (; i < groupLength; ++i) {
      if (node = group[i]) {
        exit[i] = node;
      }
    }
  }

  function bindKey(parent, group, enter, update, exit, data, key) {
    var i,
        node,
        nodeByKeyValue = new Map,
        groupLength = group.length,
        dataLength = data.length,
        keyValues = new Array(groupLength),
        keyValue;

    // Compute the key for each node.
    // If multiple nodes have the same key, the duplicates are added to exit.
    for (i = 0; i < groupLength; ++i) {
      if (node = group[i]) {
        keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
        if (nodeByKeyValue.has(keyValue)) {
          exit[i] = node;
        } else {
          nodeByKeyValue.set(keyValue, node);
        }
      }
    }

    // Compute the key for each datum.
    // If there a node associated with this key, join and add it to update.
    // If there is not (or the key is a duplicate), add it to enter.
    for (i = 0; i < dataLength; ++i) {
      keyValue = key.call(parent, data[i], i, data) + "";
      if (node = nodeByKeyValue.get(keyValue)) {
        update[i] = node;
        node.__data__ = data[i];
        nodeByKeyValue.delete(keyValue);
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }

    // Add any remaining nodes that were not bound to data to exit.
    for (i = 0; i < groupLength; ++i) {
      if ((node = group[i]) && (nodeByKeyValue.get(keyValues[i]) === node)) {
        exit[i] = node;
      }
    }
  }

  function datum(node) {
    return node.__data__;
  }

  function selection_data(value, key) {
    if (!arguments.length) return Array.from(this, datum);

    var bind = key ? bindKey : bindIndex,
        parents = this._parents,
        groups = this._groups;

    if (typeof value !== "function") value = constant(value);

    for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
      var parent = parents[j],
          group = groups[j],
          groupLength = group.length,
          data = array(value.call(parent, parent && parent.__data__, j, parents)),
          dataLength = data.length,
          enterGroup = enter[j] = new Array(dataLength),
          updateGroup = update[j] = new Array(dataLength),
          exitGroup = exit[j] = new Array(groupLength);

      bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

      // Now connect the enter nodes to their following update node, such that
      // appendChild can insert the materialized enter node before this node,
      // rather than at the end of the parent node.
      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1) i1 = i0 + 1;
          while (!(next = updateGroup[i1]) && ++i1 < dataLength);
          previous._next = next || null;
        }
      }
    }

    update = new Selection(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }

  function selection_exit() {
    return new Selection(this._exit || this._groups.map(sparse), this._parents);
  }

  function selection_join(onenter, onupdate, onexit) {
    var enter = this.enter(), update = this, exit = this.exit();
    enter = typeof onenter === "function" ? onenter(enter) : enter.append(onenter + "");
    if (onupdate != null) update = onupdate(update);
    if (onexit == null) exit.remove(); else onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }

  function selection_merge(selection) {
    if (!(selection instanceof Selection)) throw new Error("invalid merge");

    for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }

    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }

    return new Selection(merges, this._parents);
  }

  function selection_order() {

    for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
        if (node = group[i]) {
          if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }

    return this;
  }

  function selection_sort(compare) {
    if (!compare) compare = ascending;

    function compareNode(a, b) {
      return a && b ? compare(a.__data__, b.__data__) : !a - !b;
    }

    for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          sortgroup[i] = node;
        }
      }
      sortgroup.sort(compareNode);
    }

    return new Selection(sortgroups, this._parents).order();
  }

  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function selection_call() {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }

  function selection_nodes() {
    return Array.from(this);
  }

  function selection_node() {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node) return node;
      }
    }

    return null;
  }

  function selection_size() {
    let size = 0;
    for (const node of this) ++size; // eslint-disable-line no-unused-vars
    return size;
  }

  function selection_empty() {
    return !this.node();
  }

  function selection_each(callback) {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) callback.call(node, node.__data__, i, group);
      }
    }

    return this;
  }

  function attrRemove(name) {
    return function() {
      this.removeAttribute(name);
    };
  }

  function attrRemoveNS(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }

  function attrConstant(name, value) {
    return function() {
      this.setAttribute(name, value);
    };
  }

  function attrConstantNS(fullname, value) {
    return function() {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }

  function attrFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttribute(name);
      else this.setAttribute(name, v);
    };
  }

  function attrFunctionNS(fullname, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
      else this.setAttributeNS(fullname.space, fullname.local, v);
    };
  }

  function selection_attr(name, value) {
    var fullname = namespace(name);

    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local
          ? node.getAttributeNS(fullname.space, fullname.local)
          : node.getAttribute(fullname);
    }

    return this.each((value == null
        ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
        ? (fullname.local ? attrFunctionNS : attrFunction)
        : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
  }

  function defaultView(node) {
    return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
        || (node.document && node) // node is a Window
        || node.defaultView; // node is a Document
  }

  function styleRemove(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }

  function styleConstant(name, value, priority) {
    return function() {
      this.style.setProperty(name, value, priority);
    };
  }

  function styleFunction(name, value, priority) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.style.removeProperty(name);
      else this.style.setProperty(name, v, priority);
    };
  }

  function selection_style(name, value, priority) {
    return arguments.length > 1
        ? this.each((value == null
              ? styleRemove : typeof value === "function"
              ? styleFunction
              : styleConstant)(name, value, priority == null ? "" : priority))
        : styleValue(this.node(), name);
  }

  function styleValue(node, name) {
    return node.style.getPropertyValue(name)
        || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
  }

  function propertyRemove(name) {
    return function() {
      delete this[name];
    };
  }

  function propertyConstant(name, value) {
    return function() {
      this[name] = value;
    };
  }

  function propertyFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) delete this[name];
      else this[name] = v;
    };
  }

  function selection_property(name, value) {
    return arguments.length > 1
        ? this.each((value == null
            ? propertyRemove : typeof value === "function"
            ? propertyFunction
            : propertyConstant)(name, value))
        : this.node()[name];
  }

  function classArray(string) {
    return string.trim().split(/^|\s+/);
  }

  function classList(node) {
    return node.classList || new ClassList(node);
  }

  function ClassList(node) {
    this._node = node;
    this._names = classArray(node.getAttribute("class") || "");
  }

  ClassList.prototype = {
    add: function(name) {
      var i = this._names.indexOf(name);
      if (i < 0) {
        this._names.push(name);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function(name) {
      var i = this._names.indexOf(name);
      if (i >= 0) {
        this._names.splice(i, 1);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function(name) {
      return this._names.indexOf(name) >= 0;
    }
  };

  function classedAdd(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.add(names[i]);
  }

  function classedRemove(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.remove(names[i]);
  }

  function classedTrue(names) {
    return function() {
      classedAdd(this, names);
    };
  }

  function classedFalse(names) {
    return function() {
      classedRemove(this, names);
    };
  }

  function classedFunction(names, value) {
    return function() {
      (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
    };
  }

  function selection_classed(name, value) {
    var names = classArray(name + "");

    if (arguments.length < 2) {
      var list = classList(this.node()), i = -1, n = names.length;
      while (++i < n) if (!list.contains(names[i])) return false;
      return true;
    }

    return this.each((typeof value === "function"
        ? classedFunction : value
        ? classedTrue
        : classedFalse)(names, value));
  }

  function textRemove() {
    this.textContent = "";
  }

  function textConstant(value) {
    return function() {
      this.textContent = value;
    };
  }

  function textFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    };
  }

  function selection_text(value) {
    return arguments.length
        ? this.each(value == null
            ? textRemove : (typeof value === "function"
            ? textFunction
            : textConstant)(value))
        : this.node().textContent;
  }

  function htmlRemove() {
    this.innerHTML = "";
  }

  function htmlConstant(value) {
    return function() {
      this.innerHTML = value;
    };
  }

  function htmlFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    };
  }

  function selection_html(value) {
    return arguments.length
        ? this.each(value == null
            ? htmlRemove : (typeof value === "function"
            ? htmlFunction
            : htmlConstant)(value))
        : this.node().innerHTML;
  }

  function raise() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }

  function selection_raise() {
    return this.each(raise);
  }

  function lower() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }

  function selection_lower() {
    return this.each(lower);
  }

  function selection_append(name) {
    var create = typeof name === "function" ? name : creator(name);
    return this.select(function() {
      return this.appendChild(create.apply(this, arguments));
    });
  }

  function constantNull() {
    return null;
  }

  function selection_insert(name, before) {
    var create = typeof name === "function" ? name : creator(name),
        select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
    return this.select(function() {
      return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  function remove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }

  function selection_remove() {
    return this.each(remove);
  }

  function selection_cloneShallow() {
    var clone = this.cloneNode(false), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }

  function selection_cloneDeep() {
    var clone = this.cloneNode(true), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }

  function selection_clone(deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }

  function selection_datum(value) {
    return arguments.length
        ? this.property("__data__", value)
        : this.node().__data__;
  }

  function contextListener(listener) {
    return function(event) {
      listener.call(this, event, this.__data__);
    };
  }

  function parseTypenames(typenames) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      return {type: t, name: name};
    });
  }

  function onRemove(typename) {
    return function() {
      var on = this.__on;
      if (!on) return;
      for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
        if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.options);
        } else {
          on[++i] = o;
        }
      }
      if (++i) on.length = i;
      else delete this.__on;
    };
  }

  function onAdd(typename, value, options) {
    return function() {
      var on = this.__on, o, listener = contextListener(value);
      if (on) for (var j = 0, m = on.length; j < m; ++j) {
        if ((o = on[j]).type === typename.type && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.options);
          this.addEventListener(o.type, o.listener = listener, o.options = options);
          o.value = value;
          return;
        }
      }
      this.addEventListener(typename.type, listener, options);
      o = {type: typename.type, name: typename.name, value: value, listener: listener, options: options};
      if (!on) this.__on = [o];
      else on.push(o);
    };
  }

  function selection_on(typename, value, options) {
    var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;

    if (arguments.length < 2) {
      var on = this.node().__on;
      if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
        for (i = 0, o = on[j]; i < n; ++i) {
          if ((t = typenames[i]).type === o.type && t.name === o.name) {
            return o.value;
          }
        }
      }
      return;
    }

    on = value ? onAdd : onRemove;
    for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
    return this;
  }

  function dispatchEvent(node, type, params) {
    var window = defaultView(node),
        event = window.CustomEvent;

    if (typeof event === "function") {
      event = new event(type, params);
    } else {
      event = window.document.createEvent("Event");
      if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
      else event.initEvent(type, false, false);
    }

    node.dispatchEvent(event);
  }

  function dispatchConstant(type, params) {
    return function() {
      return dispatchEvent(this, type, params);
    };
  }

  function dispatchFunction(type, params) {
    return function() {
      return dispatchEvent(this, type, params.apply(this, arguments));
    };
  }

  function selection_dispatch(type, params) {
    return this.each((typeof params === "function"
        ? dispatchFunction
        : dispatchConstant)(type, params));
  }

  function* selection_iterator() {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) yield node;
      }
    }
  }

  var root = [null];

  function Selection(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }

  function selection() {
    return new Selection([[document.documentElement]], root);
  }

  function selection_selection() {
    return this;
  }

  Selection.prototype = selection.prototype = {
    constructor: Selection,
    select: selection_select,
    selectAll: selection_selectAll,
    selectChild: selection_selectChild,
    selectChildren: selection_selectChildren,
    filter: selection_filter,
    data: selection_data,
    enter: selection_enter,
    exit: selection_exit,
    join: selection_join,
    merge: selection_merge,
    selection: selection_selection,
    order: selection_order,
    sort: selection_sort,
    call: selection_call,
    nodes: selection_nodes,
    node: selection_node,
    size: selection_size,
    empty: selection_empty,
    each: selection_each,
    attr: selection_attr,
    style: selection_style,
    property: selection_property,
    classed: selection_classed,
    text: selection_text,
    html: selection_html,
    raise: selection_raise,
    lower: selection_lower,
    append: selection_append,
    insert: selection_insert,
    remove: selection_remove,
    clone: selection_clone,
    datum: selection_datum,
    on: selection_on,
    dispatch: selection_dispatch,
    [Symbol.iterator]: selection_iterator
  };

  function select(selector) {
    return typeof selector === "string"
        ? new Selection([[document.querySelector(selector)]], [document.documentElement])
        : new Selection([[selector]], root);
  }

  function sourceEvent(event) {
    let sourceEvent;
    while (sourceEvent = event.sourceEvent) event = sourceEvent;
    return event;
  }

  function pointer(event, node) {
    event = sourceEvent(event);
    if (node === undefined) node = event.currentTarget;
    if (node) {
      var svg = node.ownerSVGElement || node;
      if (svg.createSVGPoint) {
        var point = svg.createSVGPoint();
        point.x = event.clientX, point.y = event.clientY;
        point = point.matrixTransform(node.getScreenCTM().inverse());
        return [point.x, point.y];
      }
      if (node.getBoundingClientRect) {
        var rect = node.getBoundingClientRect();
        return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
      }
    }
    return [event.pageX, event.pageY];
  }

  function selectAll(selector) {
    return typeof selector === "string"
        ? new Selection([document.querySelectorAll(selector)], [document.documentElement])
        : new Selection([selector == null ? [] : array(selector)], root);
  }

  function ascending$1(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function bisector(f) {
    let delta = f;
    let compare = f;

    if (f.length === 1) {
      delta = (d, x) => f(d) - x;
      compare = ascendingComparator(f);
    }

    function left(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (compare(a[mid], x) < 0) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    }

    function right(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (compare(a[mid], x) > 0) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    }

    function center(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      const i = left(a, x, lo, hi);
      return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
    }

    return {left, center, right};
  }

  function ascendingComparator(f) {
    return (d, x) => ascending$1(f(d), x);
  }

  var ascendingBisect = bisector(ascending$1);
  var bisectRight = ascendingBisect.right;

  var e10 = Math.sqrt(50),
      e5 = Math.sqrt(10),
      e2 = Math.sqrt(2);

  function ticks(start, stop, count) {
    var reverse,
        i = -1,
        n,
        ticks,
        step;

    stop = +stop, start = +start, count = +count;
    if (start === stop && count > 0) return [start];
    if (reverse = stop < start) n = start, start = stop, stop = n;
    if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

    if (step > 0) {
      start = Math.ceil(start / step);
      stop = Math.floor(stop / step);
      ticks = new Array(n = Math.ceil(stop - start + 1));
      while (++i < n) ticks[i] = (start + i) * step;
    } else {
      step = -step;
      start = Math.ceil(start * step);
      stop = Math.floor(stop * step);
      ticks = new Array(n = Math.ceil(stop - start + 1));
      while (++i < n) ticks[i] = (start + i) / step;
    }

    if (reverse) ticks.reverse();

    return ticks;
  }

  function tickIncrement(start, stop, count) {
    var step = (stop - start) / Math.max(0, count),
        power = Math.floor(Math.log(step) / Math.LN10),
        error = step / Math.pow(10, power);
    return power >= 0
        ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
        : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
  }

  function tickStep(start, stop, count) {
    var step0 = Math.abs(stop - start) / Math.max(0, count),
        step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
        error = step0 / step1;
    if (error >= e10) step1 *= 10;
    else if (error >= e5) step1 *= 5;
    else if (error >= e2) step1 *= 2;
    return stop < start ? -step1 : step1;
  }

  function initRange(domain, range) {
    switch (arguments.length) {
      case 0: break;
      case 1: this.range(domain); break;
      default: this.range(range).domain(domain); break;
    }
    return this;
  }

  function define(constructor, factory, prototype) {
    constructor.prototype = factory.prototype = prototype;
    prototype.constructor = constructor;
  }

  function extend(parent, definition) {
    var prototype = Object.create(parent.prototype);
    for (var key in definition) prototype[key] = definition[key];
    return prototype;
  }

  function Color() {}

  var darker = 0.7;
  var brighter = 1 / darker;

  var reI = "\\s*([+-]?\\d+)\\s*",
      reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
      reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
      reHex = /^#([0-9a-f]{3,8})$/,
      reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
      reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
      reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
      reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
      reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
      reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

  var named = {
    aliceblue: 0xf0f8ff,
    antiquewhite: 0xfaebd7,
    aqua: 0x00ffff,
    aquamarine: 0x7fffd4,
    azure: 0xf0ffff,
    beige: 0xf5f5dc,
    bisque: 0xffe4c4,
    black: 0x000000,
    blanchedalmond: 0xffebcd,
    blue: 0x0000ff,
    blueviolet: 0x8a2be2,
    brown: 0xa52a2a,
    burlywood: 0xdeb887,
    cadetblue: 0x5f9ea0,
    chartreuse: 0x7fff00,
    chocolate: 0xd2691e,
    coral: 0xff7f50,
    cornflowerblue: 0x6495ed,
    cornsilk: 0xfff8dc,
    crimson: 0xdc143c,
    cyan: 0x00ffff,
    darkblue: 0x00008b,
    darkcyan: 0x008b8b,
    darkgoldenrod: 0xb8860b,
    darkgray: 0xa9a9a9,
    darkgreen: 0x006400,
    darkgrey: 0xa9a9a9,
    darkkhaki: 0xbdb76b,
    darkmagenta: 0x8b008b,
    darkolivegreen: 0x556b2f,
    darkorange: 0xff8c00,
    darkorchid: 0x9932cc,
    darkred: 0x8b0000,
    darksalmon: 0xe9967a,
    darkseagreen: 0x8fbc8f,
    darkslateblue: 0x483d8b,
    darkslategray: 0x2f4f4f,
    darkslategrey: 0x2f4f4f,
    darkturquoise: 0x00ced1,
    darkviolet: 0x9400d3,
    deeppink: 0xff1493,
    deepskyblue: 0x00bfff,
    dimgray: 0x696969,
    dimgrey: 0x696969,
    dodgerblue: 0x1e90ff,
    firebrick: 0xb22222,
    floralwhite: 0xfffaf0,
    forestgreen: 0x228b22,
    fuchsia: 0xff00ff,
    gainsboro: 0xdcdcdc,
    ghostwhite: 0xf8f8ff,
    gold: 0xffd700,
    goldenrod: 0xdaa520,
    gray: 0x808080,
    green: 0x008000,
    greenyellow: 0xadff2f,
    grey: 0x808080,
    honeydew: 0xf0fff0,
    hotpink: 0xff69b4,
    indianred: 0xcd5c5c,
    indigo: 0x4b0082,
    ivory: 0xfffff0,
    khaki: 0xf0e68c,
    lavender: 0xe6e6fa,
    lavenderblush: 0xfff0f5,
    lawngreen: 0x7cfc00,
    lemonchiffon: 0xfffacd,
    lightblue: 0xadd8e6,
    lightcoral: 0xf08080,
    lightcyan: 0xe0ffff,
    lightgoldenrodyellow: 0xfafad2,
    lightgray: 0xd3d3d3,
    lightgreen: 0x90ee90,
    lightgrey: 0xd3d3d3,
    lightpink: 0xffb6c1,
    lightsalmon: 0xffa07a,
    lightseagreen: 0x20b2aa,
    lightskyblue: 0x87cefa,
    lightslategray: 0x778899,
    lightslategrey: 0x778899,
    lightsteelblue: 0xb0c4de,
    lightyellow: 0xffffe0,
    lime: 0x00ff00,
    limegreen: 0x32cd32,
    linen: 0xfaf0e6,
    magenta: 0xff00ff,
    maroon: 0x800000,
    mediumaquamarine: 0x66cdaa,
    mediumblue: 0x0000cd,
    mediumorchid: 0xba55d3,
    mediumpurple: 0x9370db,
    mediumseagreen: 0x3cb371,
    mediumslateblue: 0x7b68ee,
    mediumspringgreen: 0x00fa9a,
    mediumturquoise: 0x48d1cc,
    mediumvioletred: 0xc71585,
    midnightblue: 0x191970,
    mintcream: 0xf5fffa,
    mistyrose: 0xffe4e1,
    moccasin: 0xffe4b5,
    navajowhite: 0xffdead,
    navy: 0x000080,
    oldlace: 0xfdf5e6,
    olive: 0x808000,
    olivedrab: 0x6b8e23,
    orange: 0xffa500,
    orangered: 0xff4500,
    orchid: 0xda70d6,
    palegoldenrod: 0xeee8aa,
    palegreen: 0x98fb98,
    paleturquoise: 0xafeeee,
    palevioletred: 0xdb7093,
    papayawhip: 0xffefd5,
    peachpuff: 0xffdab9,
    peru: 0xcd853f,
    pink: 0xffc0cb,
    plum: 0xdda0dd,
    powderblue: 0xb0e0e6,
    purple: 0x800080,
    rebeccapurple: 0x663399,
    red: 0xff0000,
    rosybrown: 0xbc8f8f,
    royalblue: 0x4169e1,
    saddlebrown: 0x8b4513,
    salmon: 0xfa8072,
    sandybrown: 0xf4a460,
    seagreen: 0x2e8b57,
    seashell: 0xfff5ee,
    sienna: 0xa0522d,
    silver: 0xc0c0c0,
    skyblue: 0x87ceeb,
    slateblue: 0x6a5acd,
    slategray: 0x708090,
    slategrey: 0x708090,
    snow: 0xfffafa,
    springgreen: 0x00ff7f,
    steelblue: 0x4682b4,
    tan: 0xd2b48c,
    teal: 0x008080,
    thistle: 0xd8bfd8,
    tomato: 0xff6347,
    turquoise: 0x40e0d0,
    violet: 0xee82ee,
    wheat: 0xf5deb3,
    white: 0xffffff,
    whitesmoke: 0xf5f5f5,
    yellow: 0xffff00,
    yellowgreen: 0x9acd32
  };

  define(Color, color, {
    copy: function(channels) {
      return Object.assign(new this.constructor, this, channels);
    },
    displayable: function() {
      return this.rgb().displayable();
    },
    hex: color_formatHex, // Deprecated! Use color.formatHex.
    formatHex: color_formatHex,
    formatHsl: color_formatHsl,
    formatRgb: color_formatRgb,
    toString: color_formatRgb
  });

  function color_formatHex() {
    return this.rgb().formatHex();
  }

  function color_formatHsl() {
    return hslConvert(this).formatHsl();
  }

  function color_formatRgb() {
    return this.rgb().formatRgb();
  }

  function color(format) {
    var m, l;
    format = (format + "").trim().toLowerCase();
    return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
        : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
        : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
        : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
        : null) // invalid hex
        : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
        : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
        : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
        : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
        : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
        : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
        : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
        : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
        : null;
  }

  function rgbn(n) {
    return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
  }

  function rgba(r, g, b, a) {
    if (a <= 0) r = g = b = NaN;
    return new Rgb(r, g, b, a);
  }

  function rgbConvert(o) {
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Rgb;
    o = o.rgb();
    return new Rgb(o.r, o.g, o.b, o.opacity);
  }

  function rgb(r, g, b, opacity) {
    return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
  }

  function Rgb(r, g, b, opacity) {
    this.r = +r;
    this.g = +g;
    this.b = +b;
    this.opacity = +opacity;
  }

  define(Rgb, rgb, extend(Color, {
    brighter: function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    darker: function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    rgb: function() {
      return this;
    },
    displayable: function() {
      return (-0.5 <= this.r && this.r < 255.5)
          && (-0.5 <= this.g && this.g < 255.5)
          && (-0.5 <= this.b && this.b < 255.5)
          && (0 <= this.opacity && this.opacity <= 1);
    },
    hex: rgb_formatHex, // Deprecated! Use color.formatHex.
    formatHex: rgb_formatHex,
    formatRgb: rgb_formatRgb,
    toString: rgb_formatRgb
  }));

  function rgb_formatHex() {
    return "#" + hex(this.r) + hex(this.g) + hex(this.b);
  }

  function rgb_formatRgb() {
    var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
    return (a === 1 ? "rgb(" : "rgba(")
        + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.b) || 0))
        + (a === 1 ? ")" : ", " + a + ")");
  }

  function hex(value) {
    value = Math.max(0, Math.min(255, Math.round(value) || 0));
    return (value < 16 ? "0" : "") + value.toString(16);
  }

  function hsla(h, s, l, a) {
    if (a <= 0) h = s = l = NaN;
    else if (l <= 0 || l >= 1) h = s = NaN;
    else if (s <= 0) h = NaN;
    return new Hsl(h, s, l, a);
  }

  function hslConvert(o) {
    if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Hsl;
    if (o instanceof Hsl) return o;
    o = o.rgb();
    var r = o.r / 255,
        g = o.g / 255,
        b = o.b / 255,
        min = Math.min(r, g, b),
        max = Math.max(r, g, b),
        h = NaN,
        s = max - min,
        l = (max + min) / 2;
    if (s) {
      if (r === max) h = (g - b) / s + (g < b) * 6;
      else if (g === max) h = (b - r) / s + 2;
      else h = (r - g) / s + 4;
      s /= l < 0.5 ? max + min : 2 - max - min;
      h *= 60;
    } else {
      s = l > 0 && l < 1 ? 0 : h;
    }
    return new Hsl(h, s, l, o.opacity);
  }

  function hsl(h, s, l, opacity) {
    return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
  }

  function Hsl(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }

  define(Hsl, hsl, extend(Color, {
    brighter: function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    darker: function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    rgb: function() {
      var h = this.h % 360 + (this.h < 0) * 360,
          s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
          l = this.l,
          m2 = l + (l < 0.5 ? l : 1 - l) * s,
          m1 = 2 * l - m2;
      return new Rgb(
        hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
        hsl2rgb(h, m1, m2),
        hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
        this.opacity
      );
    },
    displayable: function() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s))
          && (0 <= this.l && this.l <= 1)
          && (0 <= this.opacity && this.opacity <= 1);
    },
    formatHsl: function() {
      var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
      return (a === 1 ? "hsl(" : "hsla(")
          + (this.h || 0) + ", "
          + (this.s || 0) * 100 + "%, "
          + (this.l || 0) * 100 + "%"
          + (a === 1 ? ")" : ", " + a + ")");
    }
  }));

  /* From FvD 13.37, CSS Color Module Level 3 */
  function hsl2rgb(h, m1, m2) {
    return (h < 60 ? m1 + (m2 - m1) * h / 60
        : h < 180 ? m2
        : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
        : m1) * 255;
  }

  var constant$1 = x => () => x;

  function linear(a, d) {
    return function(t) {
      return a + t * d;
    };
  }

  function exponential(a, b, y) {
    return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
      return Math.pow(a + t * b, y);
    };
  }

  function gamma(y) {
    return (y = +y) === 1 ? nogamma : function(a, b) {
      return b - a ? exponential(a, b, y) : constant$1(isNaN(a) ? b : a);
    };
  }

  function nogamma(a, b) {
    var d = b - a;
    return d ? linear(a, d) : constant$1(isNaN(a) ? b : a);
  }

  var rgb$1 = (function rgbGamma(y) {
    var color = gamma(y);

    function rgb$1(start, end) {
      var r = color((start = rgb(start)).r, (end = rgb(end)).r),
          g = color(start.g, end.g),
          b = color(start.b, end.b),
          opacity = nogamma(start.opacity, end.opacity);
      return function(t) {
        start.r = r(t);
        start.g = g(t);
        start.b = b(t);
        start.opacity = opacity(t);
        return start + "";
      };
    }

    rgb$1.gamma = rgbGamma;

    return rgb$1;
  })(1);

  function numberArray(a, b) {
    if (!b) b = [];
    var n = a ? Math.min(b.length, a.length) : 0,
        c = b.slice(),
        i;
    return function(t) {
      for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
      return c;
    };
  }

  function isNumberArray(x) {
    return ArrayBuffer.isView(x) && !(x instanceof DataView);
  }

  function genericArray(a, b) {
    var nb = b ? b.length : 0,
        na = a ? Math.min(nb, a.length) : 0,
        x = new Array(na),
        c = new Array(nb),
        i;

    for (i = 0; i < na; ++i) x[i] = interpolate(a[i], b[i]);
    for (; i < nb; ++i) c[i] = b[i];

    return function(t) {
      for (i = 0; i < na; ++i) c[i] = x[i](t);
      return c;
    };
  }

  function date(a, b) {
    var d = new Date;
    return a = +a, b = +b, function(t) {
      return d.setTime(a * (1 - t) + b * t), d;
    };
  }

  function interpolateNumber(a, b) {
    return a = +a, b = +b, function(t) {
      return a * (1 - t) + b * t;
    };
  }

  function object(a, b) {
    var i = {},
        c = {},
        k;

    if (a === null || typeof a !== "object") a = {};
    if (b === null || typeof b !== "object") b = {};

    for (k in b) {
      if (k in a) {
        i[k] = interpolate(a[k], b[k]);
      } else {
        c[k] = b[k];
      }
    }

    return function(t) {
      for (k in i) c[k] = i[k](t);
      return c;
    };
  }

  var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
      reB = new RegExp(reA.source, "g");

  function zero(b) {
    return function() {
      return b;
    };
  }

  function one(b) {
    return function(t) {
      return b(t) + "";
    };
  }

  function string(a, b) {
    var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
        am, // current match in a
        bm, // current match in b
        bs, // string preceding current number in b, if any
        i = -1, // index in s
        s = [], // string constants and placeholders
        q = []; // number interpolators

    // Coerce inputs to strings.
    a = a + "", b = b + "";

    // Interpolate pairs of numbers in a & b.
    while ((am = reA.exec(a))
        && (bm = reB.exec(b))) {
      if ((bs = bm.index) > bi) { // a string precedes the next number in b
        bs = b.slice(bi, bs);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }
      if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
        if (s[i]) s[i] += bm; // coalesce with previous string
        else s[++i] = bm;
      } else { // interpolate non-matching numbers
        s[++i] = null;
        q.push({i: i, x: interpolateNumber(am, bm)});
      }
      bi = reB.lastIndex;
    }

    // Add remains of b.
    if (bi < b.length) {
      bs = b.slice(bi);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }

    // Special optimization for only a single match.
    // Otherwise, interpolate each of the numbers and rejoin the string.
    return s.length < 2 ? (q[0]
        ? one(q[0].x)
        : zero(b))
        : (b = q.length, function(t) {
            for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
            return s.join("");
          });
  }

  function interpolate(a, b) {
    var t = typeof b, c;
    return b == null || t === "boolean" ? constant$1(b)
        : (t === "number" ? interpolateNumber
        : t === "string" ? ((c = color(b)) ? (b = c, rgb$1) : string)
        : b instanceof color ? rgb$1
        : b instanceof Date ? date
        : isNumberArray(b) ? numberArray
        : Array.isArray(b) ? genericArray
        : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
        : interpolateNumber)(a, b);
  }

  function interpolateRound(a, b) {
    return a = +a, b = +b, function(t) {
      return Math.round(a * (1 - t) + b * t);
    };
  }

  function constant$2(x) {
    return function() {
      return x;
    };
  }

  function number(x) {
    return +x;
  }

  var unit = [0, 1];

  function identity(x) {
    return x;
  }

  function normalize(a, b) {
    return (b -= (a = +a))
        ? function(x) { return (x - a) / b; }
        : constant$2(isNaN(b) ? NaN : 0.5);
  }

  function clamper(a, b) {
    var t;
    if (a > b) t = a, a = b, b = t;
    return function(x) { return Math.max(a, Math.min(b, x)); };
  }

  // normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
  // interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
  function bimap(domain, range, interpolate) {
    var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
    if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
    else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
    return function(x) { return r0(d0(x)); };
  }

  function polymap(domain, range, interpolate) {
    var j = Math.min(domain.length, range.length) - 1,
        d = new Array(j),
        r = new Array(j),
        i = -1;

    // Reverse descending domains.
    if (domain[j] < domain[0]) {
      domain = domain.slice().reverse();
      range = range.slice().reverse();
    }

    while (++i < j) {
      d[i] = normalize(domain[i], domain[i + 1]);
      r[i] = interpolate(range[i], range[i + 1]);
    }

    return function(x) {
      var i = bisectRight(domain, x, 1, j) - 1;
      return r[i](d[i](x));
    };
  }

  function copy(source, target) {
    return target
        .domain(source.domain())
        .range(source.range())
        .interpolate(source.interpolate())
        .clamp(source.clamp())
        .unknown(source.unknown());
  }

  function transformer() {
    var domain = unit,
        range = unit,
        interpolate$1 = interpolate,
        transform,
        untransform,
        unknown,
        clamp = identity,
        piecewise,
        output,
        input;

    function rescale() {
      var n = Math.min(domain.length, range.length);
      if (clamp !== identity) clamp = clamper(domain[0], domain[n - 1]);
      piecewise = n > 2 ? polymap : bimap;
      output = input = null;
      return scale;
    }

    function scale(x) {
      return isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate$1)))(transform(clamp(x)));
    }

    scale.invert = function(y) {
      return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
    };

    scale.domain = function(_) {
      return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
    };

    scale.range = function(_) {
      return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
    };

    scale.rangeRound = function(_) {
      return range = Array.from(_), interpolate$1 = interpolateRound, rescale();
    };

    scale.clamp = function(_) {
      return arguments.length ? (clamp = _ ? true : identity, rescale()) : clamp !== identity;
    };

    scale.interpolate = function(_) {
      return arguments.length ? (interpolate$1 = _, rescale()) : interpolate$1;
    };

    scale.unknown = function(_) {
      return arguments.length ? (unknown = _, scale) : unknown;
    };

    return function(t, u) {
      transform = t, untransform = u;
      return rescale();
    };
  }

  function continuous() {
    return transformer()(identity, identity);
  }

  function formatDecimal(x) {
    return Math.abs(x = Math.round(x)) >= 1e21
        ? x.toLocaleString("en").replace(/,/g, "")
        : x.toString(10);
  }

  // Computes the decimal coefficient and exponent of the specified number x with
  // significant digits p, where x is positive and p is in [1, 21] or undefined.
  // For example, formatDecimalParts(1.23) returns ["123", 0].
  function formatDecimalParts(x, p) {
    if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
    var i, coefficient = x.slice(0, i);

    // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
    // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
    return [
      coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
      +x.slice(i + 1)
    ];
  }

  function exponent(x) {
    return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
  }

  function formatGroup(grouping, thousands) {
    return function(value, width) {
      var i = value.length,
          t = [],
          j = 0,
          g = grouping[0],
          length = 0;

      while (i > 0 && g > 0) {
        if (length + g + 1 > width) g = Math.max(1, width - length);
        t.push(value.substring(i -= g, i + g));
        if ((length += g + 1) > width) break;
        g = grouping[j = (j + 1) % grouping.length];
      }

      return t.reverse().join(thousands);
    };
  }

  function formatNumerals(numerals) {
    return function(value) {
      return value.replace(/[0-9]/g, function(i) {
        return numerals[+i];
      });
    };
  }

  // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
  var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

  function formatSpecifier(specifier) {
    if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
    var match;
    return new FormatSpecifier({
      fill: match[1],
      align: match[2],
      sign: match[3],
      symbol: match[4],
      zero: match[5],
      width: match[6],
      comma: match[7],
      precision: match[8] && match[8].slice(1),
      trim: match[9],
      type: match[10]
    });
  }

  formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

  function FormatSpecifier(specifier) {
    this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
    this.align = specifier.align === undefined ? ">" : specifier.align + "";
    this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
    this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
    this.zero = !!specifier.zero;
    this.width = specifier.width === undefined ? undefined : +specifier.width;
    this.comma = !!specifier.comma;
    this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
    this.trim = !!specifier.trim;
    this.type = specifier.type === undefined ? "" : specifier.type + "";
  }

  FormatSpecifier.prototype.toString = function() {
    return this.fill
        + this.align
        + this.sign
        + this.symbol
        + (this.zero ? "0" : "")
        + (this.width === undefined ? "" : Math.max(1, this.width | 0))
        + (this.comma ? "," : "")
        + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
        + (this.trim ? "~" : "")
        + this.type;
  };

  // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
  function formatTrim(s) {
    out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
      switch (s[i]) {
        case ".": i0 = i1 = i; break;
        case "0": if (i0 === 0) i0 = i; i1 = i; break;
        default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
      }
    }
    return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
  }

  var prefixExponent;

  function formatPrefixAuto(x, p) {
    var d = formatDecimalParts(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1],
        i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
        n = coefficient.length;
    return i === n ? coefficient
        : i > n ? coefficient + new Array(i - n + 1).join("0")
        : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
        : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0]; // less than 1y!
  }

  function formatRounded(x, p) {
    var d = formatDecimalParts(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1];
    return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
        : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
        : coefficient + new Array(exponent - coefficient.length + 2).join("0");
  }

  var formatTypes = {
    "%": (x, p) => (x * 100).toFixed(p),
    "b": (x) => Math.round(x).toString(2),
    "c": (x) => x + "",
    "d": formatDecimal,
    "e": (x, p) => x.toExponential(p),
    "f": (x, p) => x.toFixed(p),
    "g": (x, p) => x.toPrecision(p),
    "o": (x) => Math.round(x).toString(8),
    "p": (x, p) => formatRounded(x * 100, p),
    "r": formatRounded,
    "s": formatPrefixAuto,
    "X": (x) => Math.round(x).toString(16).toUpperCase(),
    "x": (x) => Math.round(x).toString(16)
  };

  function identity$1(x) {
    return x;
  }

  var map = Array.prototype.map,
      prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

  function formatLocale(locale) {
    var group = locale.grouping === undefined || locale.thousands === undefined ? identity$1 : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
        currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
        currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
        decimal = locale.decimal === undefined ? "." : locale.decimal + "",
        numerals = locale.numerals === undefined ? identity$1 : formatNumerals(map.call(locale.numerals, String)),
        percent = locale.percent === undefined ? "%" : locale.percent + "",
        minus = locale.minus === undefined ? "−" : locale.minus + "",
        nan = locale.nan === undefined ? "NaN" : locale.nan + "";

    function newFormat(specifier) {
      specifier = formatSpecifier(specifier);

      var fill = specifier.fill,
          align = specifier.align,
          sign = specifier.sign,
          symbol = specifier.symbol,
          zero = specifier.zero,
          width = specifier.width,
          comma = specifier.comma,
          precision = specifier.precision,
          trim = specifier.trim,
          type = specifier.type;

      // The "n" type is an alias for ",g".
      if (type === "n") comma = true, type = "g";

      // The "" type, and any invalid type, is an alias for ".12~g".
      else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

      // If zero fill is specified, padding goes after sign and before digits.
      if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

      // Compute the prefix and suffix.
      // For SI-prefix, the suffix is lazily computed.
      var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
          suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

      // What format function should we use?
      // Is this an integer type?
      // Can this type generate exponential notation?
      var formatType = formatTypes[type],
          maybeSuffix = /[defgprs%]/.test(type);

      // Set the default precision if not specified,
      // or clamp the specified precision to the supported range.
      // For significant precision, it must be in [1, 21].
      // For fixed precision, it must be in [0, 20].
      precision = precision === undefined ? 6
          : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
          : Math.max(0, Math.min(20, precision));

      function format(value) {
        var valuePrefix = prefix,
            valueSuffix = suffix,
            i, n, c;

        if (type === "c") {
          valueSuffix = formatType(value) + valueSuffix;
          value = "";
        } else {
          value = +value;

          // Determine the sign. -0 is not less than 0, but 1 / -0 is!
          var valueNegative = value < 0 || 1 / value < 0;

          // Perform the initial formatting.
          value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

          // Trim insignificant zeros.
          if (trim) value = formatTrim(value);

          // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
          if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

          // Compute the prefix and suffix.
          valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
          valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

          // Break the formatted value into the integer “value” part that can be
          // grouped, and fractional or exponential “suffix” part that is not.
          if (maybeSuffix) {
            i = -1, n = value.length;
            while (++i < n) {
              if (c = value.charCodeAt(i), 48 > c || c > 57) {
                valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                value = value.slice(0, i);
                break;
              }
            }
          }
        }

        // If the fill character is not "0", grouping is applied before padding.
        if (comma && !zero) value = group(value, Infinity);

        // Compute the padding.
        var length = valuePrefix.length + value.length + valueSuffix.length,
            padding = length < width ? new Array(width - length + 1).join(fill) : "";

        // If the fill character is "0", grouping is applied after padding.
        if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

        // Reconstruct the final output based on the desired alignment.
        switch (align) {
          case "<": value = valuePrefix + value + valueSuffix + padding; break;
          case "=": value = valuePrefix + padding + value + valueSuffix; break;
          case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
          default: value = padding + valuePrefix + value + valueSuffix; break;
        }

        return numerals(value);
      }

      format.toString = function() {
        return specifier + "";
      };

      return format;
    }

    function formatPrefix(specifier, value) {
      var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
          e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
          k = Math.pow(10, -e),
          prefix = prefixes[8 + e / 3];
      return function(value) {
        return f(k * value) + prefix;
      };
    }

    return {
      format: newFormat,
      formatPrefix: formatPrefix
    };
  }

  var locale;
  var format;
  var formatPrefix;

  defaultLocale({
    thousands: ",",
    grouping: [3],
    currency: ["$", ""]
  });

  function defaultLocale(definition) {
    locale = formatLocale(definition);
    format = locale.format;
    formatPrefix = locale.formatPrefix;
    return locale;
  }

  function precisionFixed(step) {
    return Math.max(0, -exponent(Math.abs(step)));
  }

  function precisionPrefix(step, value) {
    return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
  }

  function precisionRound(step, max) {
    step = Math.abs(step), max = Math.abs(max) - step;
    return Math.max(0, exponent(max) - exponent(step)) + 1;
  }

  function tickFormat(start, stop, count, specifier) {
    var step = tickStep(start, stop, count),
        precision;
    specifier = formatSpecifier(specifier == null ? ",f" : specifier);
    switch (specifier.type) {
      case "s": {
        var value = Math.max(Math.abs(start), Math.abs(stop));
        if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
        return formatPrefix(specifier, value);
      }
      case "":
      case "e":
      case "g":
      case "p":
      case "r": {
        if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
        break;
      }
      case "f":
      case "%": {
        if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
        break;
      }
    }
    return format(specifier);
  }

  function linearish(scale) {
    var domain = scale.domain;

    scale.ticks = function(count) {
      var d = domain();
      return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
    };

    scale.tickFormat = function(count, specifier) {
      var d = domain();
      return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
    };

    scale.nice = function(count) {
      if (count == null) count = 10;

      var d = domain();
      var i0 = 0;
      var i1 = d.length - 1;
      var start = d[i0];
      var stop = d[i1];
      var prestep;
      var step;
      var maxIter = 10;

      if (stop < start) {
        step = start, start = stop, stop = step;
        step = i0, i0 = i1, i1 = step;
      }
      
      while (maxIter-- > 0) {
        step = tickIncrement(start, stop, count);
        if (step === prestep) {
          d[i0] = start;
          d[i1] = stop;
          return domain(d);
        } else if (step > 0) {
          start = Math.floor(start / step) * step;
          stop = Math.ceil(stop / step) * step;
        } else if (step < 0) {
          start = Math.ceil(start * step) / step;
          stop = Math.floor(stop * step) / step;
        } else {
          break;
        }
        prestep = step;
      }

      return scale;
    };

    return scale;
  }

  function linear$1() {
    var scale = continuous();

    scale.copy = function() {
      return copy(scale, linear$1());
    };

    initRange.apply(scale, arguments);

    return linearish(scale);
  }

  const pi = Math.PI,
      tau = 2 * pi,
      epsilon = 1e-6,
      tauEpsilon = tau - epsilon;

  function Path() {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null; // end of current subpath
    this._ = "";
  }

  function path() {
    return new Path;
  }

  Path.prototype = path.prototype = {
    constructor: Path,
    moveTo: function(x, y) {
      this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
    },
    closePath: function() {
      if (this._x1 !== null) {
        this._x1 = this._x0, this._y1 = this._y0;
        this._ += "Z";
      }
    },
    lineTo: function(x, y) {
      this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
    },
    quadraticCurveTo: function(x1, y1, x, y) {
      this._ += "Q" + (+x1) + "," + (+y1) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
    },
    bezierCurveTo: function(x1, y1, x2, y2, x, y) {
      this._ += "C" + (+x1) + "," + (+y1) + "," + (+x2) + "," + (+y2) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
    },
    arcTo: function(x1, y1, x2, y2, r) {
      x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
      var x0 = this._x1,
          y0 = this._y1,
          x21 = x2 - x1,
          y21 = y2 - y1,
          x01 = x0 - x1,
          y01 = y0 - y1,
          l01_2 = x01 * x01 + y01 * y01;

      // Is the radius negative? Error.
      if (r < 0) throw new Error("negative radius: " + r);

      // Is this path empty? Move to (x1,y1).
      if (this._x1 === null) {
        this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
      }

      // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
      else if (!(l01_2 > epsilon));

      // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
      // Equivalently, is (x1,y1) coincident with (x2,y2)?
      // Or, is the radius zero? Line to (x1,y1).
      else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
        this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
      }

      // Otherwise, draw an arc!
      else {
        var x20 = x2 - x0,
            y20 = y2 - y0,
            l21_2 = x21 * x21 + y21 * y21,
            l20_2 = x20 * x20 + y20 * y20,
            l21 = Math.sqrt(l21_2),
            l01 = Math.sqrt(l01_2),
            l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
            t01 = l / l01,
            t21 = l / l21;

        // If the start tangent is not coincident with (x0,y0), line to.
        if (Math.abs(t01 - 1) > epsilon) {
          this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
        }

        this._ += "A" + r + "," + r + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
      }
    },
    arc: function(x, y, r, a0, a1, ccw) {
      x = +x, y = +y, r = +r, ccw = !!ccw;
      var dx = r * Math.cos(a0),
          dy = r * Math.sin(a0),
          x0 = x + dx,
          y0 = y + dy,
          cw = 1 ^ ccw,
          da = ccw ? a0 - a1 : a1 - a0;

      // Is the radius negative? Error.
      if (r < 0) throw new Error("negative radius: " + r);

      // Is this path empty? Move to (x0,y0).
      if (this._x1 === null) {
        this._ += "M" + x0 + "," + y0;
      }

      // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
      else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
        this._ += "L" + x0 + "," + y0;
      }

      // Is this arc empty? We’re done.
      if (!r) return;

      // Does the angle go the wrong way? Flip the direction.
      if (da < 0) da = da % tau + tau;

      // Is this a complete circle? Draw two arcs to complete the circle.
      if (da > tauEpsilon) {
        this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
      }

      // Is this arc non-empty? Draw an arc!
      else if (da > epsilon) {
        this._ += "A" + r + "," + r + ",0," + (+(da >= pi)) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
      }
    },
    rect: function(x, y, w, h) {
      this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + (+w) + "v" + (+h) + "h" + (-w) + "Z";
    },
    toString: function() {
      return this._;
    }
  };

  function constant$3(x) {
    return function constant() {
      return x;
    };
  }

  var slice = Array.prototype.slice;

  function x(p) {
    return p[0];
  }

  function y(p) {
    return p[1];
  }

  function linkSource(d) {
    return d.source;
  }

  function linkTarget(d) {
    return d.target;
  }

  function link(curve) {
    var source = linkSource,
        target = linkTarget,
        x$1 = x,
        y$1 = y,
        context = null;

    function link() {
      var buffer, argv = slice.call(arguments), s = source.apply(this, argv), t = target.apply(this, argv);
      if (!context) context = buffer = path();
      curve(context, +x$1.apply(this, (argv[0] = s, argv)), +y$1.apply(this, argv), +x$1.apply(this, (argv[0] = t, argv)), +y$1.apply(this, argv));
      if (buffer) return context = null, buffer + "" || null;
    }

    link.source = function(_) {
      return arguments.length ? (source = _, link) : source;
    };

    link.target = function(_) {
      return arguments.length ? (target = _, link) : target;
    };

    link.x = function(_) {
      return arguments.length ? (x$1 = typeof _ === "function" ? _ : constant$3(+_), link) : x$1;
    };

    link.y = function(_) {
      return arguments.length ? (y$1 = typeof _ === "function" ? _ : constant$3(+_), link) : y$1;
    };

    link.context = function(_) {
      return arguments.length ? ((context = _ == null ? null : _), link) : context;
    };

    return link;
  }

  function curveHorizontal(context, x0, y0, x1, y1) {
    context.moveTo(x0, y0);
    context.bezierCurveTo(x0 = (x0 + x1) / 2, y0, x0, y1, x1, y1);
  }

  function curveVertical(context, x0, y0, x1, y1) {
    context.moveTo(x0, y0);
    context.bezierCurveTo(x0, y0 = (y0 + y1) / 2, x1, y0, x1, y1);
  }

  function linkHorizontal() {
    return link(curveHorizontal);
  }

  function linkVertical() {
    return link(curveVertical);
  }

  var noop = {value: () => {}};

  function dispatch() {
    for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
      if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
      _[t] = [];
    }
    return new Dispatch(_);
  }

  function Dispatch(_) {
    this._ = _;
  }

  function parseTypenames$1(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
      return {type: t, name: name};
    });
  }

  Dispatch.prototype = dispatch.prototype = {
    constructor: Dispatch,
    on: function(typename, callback) {
      var _ = this._,
          T = parseTypenames$1(typename + "", _),
          t,
          i = -1,
          n = T.length;

      // If no callback was specified, return the callback of the given type and name.
      if (arguments.length < 2) {
        while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
        return;
      }

      // If a type was specified, set the callback for the given type and name.
      // Otherwise, if a null callback was specified, remove callbacks of the given name.
      if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
      while (++i < n) {
        if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
        else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
      }

      return this;
    },
    copy: function() {
      var copy = {}, _ = this._;
      for (var t in _) copy[t] = _[t].slice();
      return new Dispatch(copy);
    },
    call: function(type, that) {
      if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    },
    apply: function(type, that, args) {
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    }
  };

  function get(type, name) {
    for (var i = 0, n = type.length, c; i < n; ++i) {
      if ((c = type[i]).name === name) {
        return c.value;
      }
    }
  }

  function set(type, name, callback) {
    for (var i = 0, n = type.length; i < n; ++i) {
      if (type[i].name === name) {
        type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
        break;
      }
    }
    if (callback != null) type.push({name: name, value: callback});
    return type;
  }

  function nopropagation(event) {
    event.stopImmediatePropagation();
  }

  function noevent(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function nodrag(view) {
    var root = view.document.documentElement,
        selection = select(view).on("dragstart.drag", noevent, true);
    if ("onselectstart" in root) {
      selection.on("selectstart.drag", noevent, true);
    } else {
      root.__noselect = root.style.MozUserSelect;
      root.style.MozUserSelect = "none";
    }
  }

  function yesdrag(view, noclick) {
    var root = view.document.documentElement,
        selection = select(view).on("dragstart.drag", null);
    if (noclick) {
      selection.on("click.drag", noevent, true);
      setTimeout(function() { selection.on("click.drag", null); }, 0);
    }
    if ("onselectstart" in root) {
      selection.on("selectstart.drag", null);
    } else {
      root.style.MozUserSelect = root.__noselect;
      delete root.__noselect;
    }
  }

  var constant$4 = x => () => x;

  function DragEvent(type, {
    sourceEvent,
    subject,
    target,
    identifier,
    active,
    x, y, dx, dy,
    dispatch
  }) {
    Object.defineProperties(this, {
      type: {value: type, enumerable: true, configurable: true},
      sourceEvent: {value: sourceEvent, enumerable: true, configurable: true},
      subject: {value: subject, enumerable: true, configurable: true},
      target: {value: target, enumerable: true, configurable: true},
      identifier: {value: identifier, enumerable: true, configurable: true},
      active: {value: active, enumerable: true, configurable: true},
      x: {value: x, enumerable: true, configurable: true},
      y: {value: y, enumerable: true, configurable: true},
      dx: {value: dx, enumerable: true, configurable: true},
      dy: {value: dy, enumerable: true, configurable: true},
      _: {value: dispatch}
    });
  }

  DragEvent.prototype.on = function() {
    var value = this._.on.apply(this._, arguments);
    return value === this._ ? this : value;
  };

  // Ignore right-click, since that should open the context menu.
  function defaultFilter(event) {
    return !event.ctrlKey && !event.button;
  }

  function defaultContainer() {
    return this.parentNode;
  }

  function defaultSubject(event, d) {
    return d == null ? {x: event.x, y: event.y} : d;
  }

  function defaultTouchable() {
    return navigator.maxTouchPoints || ("ontouchstart" in this);
  }

  function drag() {
    var filter = defaultFilter,
        container = defaultContainer,
        subject = defaultSubject,
        touchable = defaultTouchable,
        gestures = {},
        listeners = dispatch("start", "drag", "end"),
        active = 0,
        mousedownx,
        mousedowny,
        mousemoving,
        touchending,
        clickDistance2 = 0;

    function drag(selection) {
      selection
          .on("mousedown.drag", mousedowned)
        .filter(touchable)
          .on("touchstart.drag", touchstarted)
          .on("touchmove.drag", touchmoved)
          .on("touchend.drag touchcancel.drag", touchended)
          .style("touch-action", "none")
          .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
    }

    function mousedowned(event, d) {
      if (touchending || !filter.call(this, event, d)) return;
      var gesture = beforestart(this, container.call(this, event, d), event, d, "mouse");
      if (!gesture) return;
      select(event.view).on("mousemove.drag", mousemoved, true).on("mouseup.drag", mouseupped, true);
      nodrag(event.view);
      nopropagation(event);
      mousemoving = false;
      mousedownx = event.clientX;
      mousedowny = event.clientY;
      gesture("start", event);
    }

    function mousemoved(event) {
      noevent(event);
      if (!mousemoving) {
        var dx = event.clientX - mousedownx, dy = event.clientY - mousedowny;
        mousemoving = dx * dx + dy * dy > clickDistance2;
      }
      gestures.mouse("drag", event);
    }

    function mouseupped(event) {
      select(event.view).on("mousemove.drag mouseup.drag", null);
      yesdrag(event.view, mousemoving);
      noevent(event);
      gestures.mouse("end", event);
    }

    function touchstarted(event, d) {
      if (!filter.call(this, event, d)) return;
      var touches = event.changedTouches,
          c = container.call(this, event, d),
          n = touches.length, i, gesture;

      for (i = 0; i < n; ++i) {
        if (gesture = beforestart(this, c, event, d, touches[i].identifier, touches[i])) {
          nopropagation(event);
          gesture("start", event, touches[i]);
        }
      }
    }

    function touchmoved(event) {
      var touches = event.changedTouches,
          n = touches.length, i, gesture;

      for (i = 0; i < n; ++i) {
        if (gesture = gestures[touches[i].identifier]) {
          noevent(event);
          gesture("drag", event, touches[i]);
        }
      }
    }

    function touchended(event) {
      var touches = event.changedTouches,
          n = touches.length, i, gesture;

      if (touchending) clearTimeout(touchending);
      touchending = setTimeout(function() { touchending = null; }, 500); // Ghost clicks are delayed!
      for (i = 0; i < n; ++i) {
        if (gesture = gestures[touches[i].identifier]) {
          nopropagation(event);
          gesture("end", event, touches[i]);
        }
      }
    }

    function beforestart(that, container, event, d, identifier, touch) {
      var dispatch = listeners.copy(),
          p = pointer(touch || event, container), dx, dy,
          s;

      if ((s = subject.call(that, new DragEvent("beforestart", {
          sourceEvent: event,
          target: drag,
          identifier,
          active,
          x: p[0],
          y: p[1],
          dx: 0,
          dy: 0,
          dispatch
        }), d)) == null) return;

      dx = s.x - p[0] || 0;
      dy = s.y - p[1] || 0;

      return function gesture(type, event, touch) {
        var p0 = p, n;
        switch (type) {
          case "start": gestures[identifier] = gesture, n = active++; break;
          case "end": delete gestures[identifier], --active; // nobreak
          case "drag": p = pointer(touch || event, container), n = active; break;
        }
        dispatch.call(
          type,
          that,
          new DragEvent(type, {
            sourceEvent: event,
            subject: s,
            target: drag,
            identifier,
            active: n,
            x: p[0] + dx,
            y: p[1] + dy,
            dx: p[0] - p0[0],
            dy: p[1] - p0[1],
            dispatch
          }),
          d
        );
      };
    }

    drag.filter = function(_) {
      return arguments.length ? (filter = typeof _ === "function" ? _ : constant$4(!!_), drag) : filter;
    };

    drag.container = function(_) {
      return arguments.length ? (container = typeof _ === "function" ? _ : constant$4(_), drag) : container;
    };

    drag.subject = function(_) {
      return arguments.length ? (subject = typeof _ === "function" ? _ : constant$4(_), drag) : subject;
    };

    drag.touchable = function(_) {
      return arguments.length ? (touchable = typeof _ === "function" ? _ : constant$4(!!_), drag) : touchable;
    };

    drag.on = function() {
      var value = listeners.on.apply(listeners, arguments);
      return value === listeners ? drag : value;
    };

    drag.clickDistance = function(_) {
      return arguments.length ? (clickDistance2 = (_ = +_) * _, drag) : Math.sqrt(clickDistance2);
    };

    return drag;
  }

  /**
   * Returns the x,y pair measurement
   * @param referenceElement - element to position targetElement by
   * @param targetElement - element that will receive position values
   * @param padding - (optional) additional padding to account for
   */

  var resizeObservers = [];

  var hasActiveObservations = function () {
      return resizeObservers.some(function (ro) { return ro.activeTargets.length > 0; });
  };

  var hasSkippedObservations = function () {
      return resizeObservers.some(function (ro) { return ro.skippedTargets.length > 0; });
  };

  var msg = 'ResizeObserver loop completed with undelivered notifications.';
  var deliverResizeLoopError = function () {
      var event;
      if (typeof ErrorEvent === 'function') {
          event = new ErrorEvent('error', {
              message: msg
          });
      }
      else {
          event = document.createEvent('Event');
          event.initEvent('error', false, false);
          event.message = msg;
      }
      window.dispatchEvent(event);
  };

  var ResizeObserverBoxOptions;
  (function (ResizeObserverBoxOptions) {
      ResizeObserverBoxOptions["BORDER_BOX"] = "border-box";
      ResizeObserverBoxOptions["CONTENT_BOX"] = "content-box";
      ResizeObserverBoxOptions["DEVICE_PIXEL_CONTENT_BOX"] = "device-pixel-content-box";
  })(ResizeObserverBoxOptions || (ResizeObserverBoxOptions = {}));

  var DOMRectReadOnly = (function () {
      function DOMRectReadOnly(x, y, width, height) {
          this.x = x;
          this.y = y;
          this.width = width;
          this.height = height;
          this.top = this.y;
          this.left = this.x;
          this.bottom = this.top + this.height;
          this.right = this.left + this.width;
          return Object.freeze(this);
      }
      DOMRectReadOnly.prototype.toJSON = function () {
          var _a = this, x = _a.x, y = _a.y, top = _a.top, right = _a.right, bottom = _a.bottom, left = _a.left, width = _a.width, height = _a.height;
          return { x: x, y: y, top: top, right: right, bottom: bottom, left: left, width: width, height: height };
      };
      DOMRectReadOnly.fromRect = function (rectangle) {
          return new DOMRectReadOnly(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
      };
      return DOMRectReadOnly;
  }());

  var isSVG = function (target) { return target instanceof SVGElement && 'getBBox' in target; };
  var isHidden = function (target) {
      if (isSVG(target)) {
          var _a = target.getBBox(), width = _a.width, height = _a.height;
          return !width && !height;
      }
      var _b = target, offsetWidth = _b.offsetWidth, offsetHeight = _b.offsetHeight;
      return !(offsetWidth || offsetHeight || target.getClientRects().length);
  };
  var isElement = function (obj) {
      var _a, _b;
      var scope = (_b = (_a = obj) === null || _a === void 0 ? void 0 : _a.ownerDocument) === null || _b === void 0 ? void 0 : _b.defaultView;
      return !!(scope && obj instanceof scope.Element);
  };
  var isReplacedElement = function (target) {
      switch (target.tagName) {
          case 'INPUT':
              if (target.type !== 'image') {
                  break;
              }
          case 'VIDEO':
          case 'AUDIO':
          case 'EMBED':
          case 'OBJECT':
          case 'CANVAS':
          case 'IFRAME':
          case 'IMG':
              return true;
      }
      return false;
  };

  var global = typeof window !== 'undefined' ? window : {};

  var cache = new WeakMap();
  var scrollRegexp = /auto|scroll/;
  var verticalRegexp = /^tb|vertical/;
  var IE = (/msie|trident/i).test(global.navigator && global.navigator.userAgent);
  var parseDimension = function (pixel) { return parseFloat(pixel || '0'); };
  var size = function (inlineSize, blockSize, switchSizes) {
      if (inlineSize === void 0) { inlineSize = 0; }
      if (blockSize === void 0) { blockSize = 0; }
      if (switchSizes === void 0) { switchSizes = false; }
      return Object.freeze({
          inlineSize: (switchSizes ? blockSize : inlineSize) || 0,
          blockSize: (switchSizes ? inlineSize : blockSize) || 0
      });
  };
  var zeroBoxes = Object.freeze({
      devicePixelContentBoxSize: size(),
      borderBoxSize: size(),
      contentBoxSize: size(),
      contentRect: new DOMRectReadOnly(0, 0, 0, 0)
  });
  var calculateBoxSizes = function (target, forceRecalculation) {
      if (forceRecalculation === void 0) { forceRecalculation = false; }
      if (cache.has(target) && !forceRecalculation) {
          return cache.get(target);
      }
      if (isHidden(target)) {
          cache.set(target, zeroBoxes);
          return zeroBoxes;
      }
      var cs = getComputedStyle(target);
      var svg = isSVG(target) && target.ownerSVGElement && target.getBBox();
      var removePadding = !IE && cs.boxSizing === 'border-box';
      var switchSizes = verticalRegexp.test(cs.writingMode || '');
      var canScrollVertically = !svg && scrollRegexp.test(cs.overflowY || '');
      var canScrollHorizontally = !svg && scrollRegexp.test(cs.overflowX || '');
      var paddingTop = svg ? 0 : parseDimension(cs.paddingTop);
      var paddingRight = svg ? 0 : parseDimension(cs.paddingRight);
      var paddingBottom = svg ? 0 : parseDimension(cs.paddingBottom);
      var paddingLeft = svg ? 0 : parseDimension(cs.paddingLeft);
      var borderTop = svg ? 0 : parseDimension(cs.borderTopWidth);
      var borderRight = svg ? 0 : parseDimension(cs.borderRightWidth);
      var borderBottom = svg ? 0 : parseDimension(cs.borderBottomWidth);
      var borderLeft = svg ? 0 : parseDimension(cs.borderLeftWidth);
      var horizontalPadding = paddingLeft + paddingRight;
      var verticalPadding = paddingTop + paddingBottom;
      var horizontalBorderArea = borderLeft + borderRight;
      var verticalBorderArea = borderTop + borderBottom;
      var horizontalScrollbarThickness = !canScrollHorizontally ? 0 : target.offsetHeight - verticalBorderArea - target.clientHeight;
      var verticalScrollbarThickness = !canScrollVertically ? 0 : target.offsetWidth - horizontalBorderArea - target.clientWidth;
      var widthReduction = removePadding ? horizontalPadding + horizontalBorderArea : 0;
      var heightReduction = removePadding ? verticalPadding + verticalBorderArea : 0;
      var contentWidth = svg ? svg.width : parseDimension(cs.width) - widthReduction - verticalScrollbarThickness;
      var contentHeight = svg ? svg.height : parseDimension(cs.height) - heightReduction - horizontalScrollbarThickness;
      var borderBoxWidth = contentWidth + horizontalPadding + verticalScrollbarThickness + horizontalBorderArea;
      var borderBoxHeight = contentHeight + verticalPadding + horizontalScrollbarThickness + verticalBorderArea;
      var boxes = Object.freeze({
          devicePixelContentBoxSize: size(Math.round(contentWidth * devicePixelRatio), Math.round(contentHeight * devicePixelRatio), switchSizes),
          borderBoxSize: size(borderBoxWidth, borderBoxHeight, switchSizes),
          contentBoxSize: size(contentWidth, contentHeight, switchSizes),
          contentRect: new DOMRectReadOnly(paddingLeft, paddingTop, contentWidth, contentHeight)
      });
      cache.set(target, boxes);
      return boxes;
  };
  var calculateBoxSize = function (target, observedBox, forceRecalculation) {
      var _a = calculateBoxSizes(target, forceRecalculation), borderBoxSize = _a.borderBoxSize, contentBoxSize = _a.contentBoxSize, devicePixelContentBoxSize = _a.devicePixelContentBoxSize;
      switch (observedBox) {
          case ResizeObserverBoxOptions.DEVICE_PIXEL_CONTENT_BOX:
              return devicePixelContentBoxSize;
          case ResizeObserverBoxOptions.BORDER_BOX:
              return borderBoxSize;
          default:
              return contentBoxSize;
      }
  };

  var ResizeObserverEntry = (function () {
      function ResizeObserverEntry(target) {
          var boxes = calculateBoxSizes(target);
          this.target = target;
          this.contentRect = boxes.contentRect;
          this.borderBoxSize = [boxes.borderBoxSize];
          this.contentBoxSize = [boxes.contentBoxSize];
          this.devicePixelContentBoxSize = [boxes.devicePixelContentBoxSize];
      }
      return ResizeObserverEntry;
  }());

  var calculateDepthForNode = function (node) {
      if (isHidden(node)) {
          return Infinity;
      }
      var depth = 0;
      var parent = node.parentNode;
      while (parent) {
          depth += 1;
          parent = parent.parentNode;
      }
      return depth;
  };

  var broadcastActiveObservations = function () {
      var shallowestDepth = Infinity;
      var callbacks = [];
      resizeObservers.forEach(function processObserver(ro) {
          if (ro.activeTargets.length === 0) {
              return;
          }
          var entries = [];
          ro.activeTargets.forEach(function processTarget(ot) {
              var entry = new ResizeObserverEntry(ot.target);
              var targetDepth = calculateDepthForNode(ot.target);
              entries.push(entry);
              ot.lastReportedSize = calculateBoxSize(ot.target, ot.observedBox);
              if (targetDepth < shallowestDepth) {
                  shallowestDepth = targetDepth;
              }
          });
          callbacks.push(function resizeObserverCallback() {
              ro.callback.call(ro.observer, entries, ro.observer);
          });
          ro.activeTargets.splice(0, ro.activeTargets.length);
      });
      for (var _i = 0, callbacks_1 = callbacks; _i < callbacks_1.length; _i++) {
          var callback = callbacks_1[_i];
          callback();
      }
      return shallowestDepth;
  };

  var gatherActiveObservationsAtDepth = function (depth) {
      resizeObservers.forEach(function processObserver(ro) {
          ro.activeTargets.splice(0, ro.activeTargets.length);
          ro.skippedTargets.splice(0, ro.skippedTargets.length);
          ro.observationTargets.forEach(function processTarget(ot) {
              if (ot.isActive()) {
                  if (calculateDepthForNode(ot.target) > depth) {
                      ro.activeTargets.push(ot);
                  }
                  else {
                      ro.skippedTargets.push(ot);
                  }
              }
          });
      });
  };

  var process = function () {
      var depth = 0;
      gatherActiveObservationsAtDepth(depth);
      while (hasActiveObservations()) {
          depth = broadcastActiveObservations();
          gatherActiveObservationsAtDepth(depth);
      }
      if (hasSkippedObservations()) {
          deliverResizeLoopError();
      }
      return depth > 0;
  };

  var trigger;
  var callbacks = [];
  var notify = function () { return callbacks.splice(0).forEach(function (cb) { return cb(); }); };
  var queueMicroTask = function (callback) {
      if (!trigger) {
          var toggle_1 = 0;
          var el_1 = document.createTextNode('');
          var config = { characterData: true };
          new MutationObserver(function () { return notify(); }).observe(el_1, config);
          trigger = function () { el_1.textContent = "" + (toggle_1 ? toggle_1-- : toggle_1++); };
      }
      callbacks.push(callback);
      trigger();
  };

  var queueResizeObserver = function (cb) {
      queueMicroTask(function ResizeObserver() {
          requestAnimationFrame(cb);
      });
  };

  var watching = 0;
  var isWatching = function () { return !!watching; };
  var CATCH_PERIOD = 250;
  var observerConfig = { attributes: true, characterData: true, childList: true, subtree: true };
  var events = [
      'resize',
      'load',
      'transitionend',
      'animationend',
      'animationstart',
      'animationiteration',
      'keyup',
      'keydown',
      'mouseup',
      'mousedown',
      'mouseover',
      'mouseout',
      'blur',
      'focus'
  ];
  var time = function (timeout) {
      if (timeout === void 0) { timeout = 0; }
      return Date.now() + timeout;
  };
  var scheduled = false;
  var Scheduler = (function () {
      function Scheduler() {
          var _this = this;
          this.stopped = true;
          this.listener = function () { return _this.schedule(); };
      }
      Scheduler.prototype.run = function (timeout) {
          var _this = this;
          if (timeout === void 0) { timeout = CATCH_PERIOD; }
          if (scheduled) {
              return;
          }
          scheduled = true;
          var until = time(timeout);
          queueResizeObserver(function () {
              var elementsHaveResized = false;
              try {
                  elementsHaveResized = process();
              }
              finally {
                  scheduled = false;
                  timeout = until - time();
                  if (!isWatching()) {
                      return;
                  }
                  if (elementsHaveResized) {
                      _this.run(1000);
                  }
                  else if (timeout > 0) {
                      _this.run(timeout);
                  }
                  else {
                      _this.start();
                  }
              }
          });
      };
      Scheduler.prototype.schedule = function () {
          this.stop();
          this.run();
      };
      Scheduler.prototype.observe = function () {
          var _this = this;
          var cb = function () { return _this.observer && _this.observer.observe(document.body, observerConfig); };
          document.body ? cb() : global.addEventListener('DOMContentLoaded', cb);
      };
      Scheduler.prototype.start = function () {
          var _this = this;
          if (this.stopped) {
              this.stopped = false;
              this.observer = new MutationObserver(this.listener);
              this.observe();
              events.forEach(function (name) { return global.addEventListener(name, _this.listener, true); });
          }
      };
      Scheduler.prototype.stop = function () {
          var _this = this;
          if (!this.stopped) {
              this.observer && this.observer.disconnect();
              events.forEach(function (name) { return global.removeEventListener(name, _this.listener, true); });
              this.stopped = true;
          }
      };
      return Scheduler;
  }());
  var scheduler = new Scheduler();
  var updateCount = function (n) {
      !watching && n > 0 && scheduler.start();
      watching += n;
      !watching && scheduler.stop();
  };

  var skipNotifyOnElement = function (target) {
      return !isSVG(target)
          && !isReplacedElement(target)
          && getComputedStyle(target).display === 'inline';
  };
  var ResizeObservation = (function () {
      function ResizeObservation(target, observedBox) {
          this.target = target;
          this.observedBox = observedBox || ResizeObserverBoxOptions.CONTENT_BOX;
          this.lastReportedSize = {
              inlineSize: 0,
              blockSize: 0
          };
      }
      ResizeObservation.prototype.isActive = function () {
          var size = calculateBoxSize(this.target, this.observedBox, true);
          if (skipNotifyOnElement(this.target)) {
              this.lastReportedSize = size;
          }
          if (this.lastReportedSize.inlineSize !== size.inlineSize
              || this.lastReportedSize.blockSize !== size.blockSize) {
              return true;
          }
          return false;
      };
      return ResizeObservation;
  }());

  var ResizeObserverDetail = (function () {
      function ResizeObserverDetail(resizeObserver, callback) {
          this.activeTargets = [];
          this.skippedTargets = [];
          this.observationTargets = [];
          this.observer = resizeObserver;
          this.callback = callback;
      }
      return ResizeObserverDetail;
  }());

  var observerMap = new WeakMap();
  var getObservationIndex = function (observationTargets, target) {
      for (var i = 0; i < observationTargets.length; i += 1) {
          if (observationTargets[i].target === target) {
              return i;
          }
      }
      return -1;
  };
  var ResizeObserverController = (function () {
      function ResizeObserverController() {
      }
      ResizeObserverController.connect = function (resizeObserver, callback) {
          var detail = new ResizeObserverDetail(resizeObserver, callback);
          observerMap.set(resizeObserver, detail);
      };
      ResizeObserverController.observe = function (resizeObserver, target, options) {
          var detail = observerMap.get(resizeObserver);
          var firstObservation = detail.observationTargets.length === 0;
          if (getObservationIndex(detail.observationTargets, target) < 0) {
              firstObservation && resizeObservers.push(detail);
              detail.observationTargets.push(new ResizeObservation(target, options && options.box));
              updateCount(1);
              scheduler.schedule();
          }
      };
      ResizeObserverController.unobserve = function (resizeObserver, target) {
          var detail = observerMap.get(resizeObserver);
          var index = getObservationIndex(detail.observationTargets, target);
          var lastObservation = detail.observationTargets.length === 1;
          if (index >= 0) {
              lastObservation && resizeObservers.splice(resizeObservers.indexOf(detail), 1);
              detail.observationTargets.splice(index, 1);
              updateCount(-1);
          }
      };
      ResizeObserverController.disconnect = function (resizeObserver) {
          var _this = this;
          var detail = observerMap.get(resizeObserver);
          detail.observationTargets.slice().forEach(function (ot) { return _this.unobserve(resizeObserver, ot.target); });
          detail.activeTargets.splice(0, detail.activeTargets.length);
      };
      return ResizeObserverController;
  }());

  var ResizeObserver = (function () {
      function ResizeObserver(callback) {
          if (arguments.length === 0) {
              throw new TypeError("Failed to construct 'ResizeObserver': 1 argument required, but only 0 present.");
          }
          if (typeof callback !== 'function') {
              throw new TypeError("Failed to construct 'ResizeObserver': The callback provided as parameter 1 is not a function.");
          }
          ResizeObserverController.connect(this, callback);
      }
      ResizeObserver.prototype.observe = function (target, options) {
          if (arguments.length === 0) {
              throw new TypeError("Failed to execute 'observe' on 'ResizeObserver': 1 argument required, but only 0 present.");
          }
          if (!isElement(target)) {
              throw new TypeError("Failed to execute 'observe' on 'ResizeObserver': parameter 1 is not of type 'Element");
          }
          ResizeObserverController.observe(this, target, options);
      };
      ResizeObserver.prototype.unobserve = function (target) {
          if (arguments.length === 0) {
              throw new TypeError("Failed to execute 'unobserve' on 'ResizeObserver': 1 argument required, but only 0 present.");
          }
          if (!isElement(target)) {
              throw new TypeError("Failed to execute 'unobserve' on 'ResizeObserver': parameter 1 is not of type 'Element");
          }
          ResizeObserverController.unobserve(this, target);
      };
      ResizeObserver.prototype.disconnect = function () {
          ResizeObserverController.disconnect(this);
      };
      ResizeObserver.toString = function () {
          return 'function ResizeObserver () { [polyfill code] }';
      };
      return ResizeObserver;
  }());

  const NS = {
      svg: "http://www.w3.org/2000/svg",
      xhtml: "http://www.w3.org/1999/xhtml",
      xlink: "http://www.w3.org/1999/xlink",
      xml: "http://www.w3.org/XML/1998/namespace",
      xmlns: "http://www.w3.org/2000/xmlns/"
  };
  /**
   * Creates SVG element for use with D3 visualisations
   * @param container - parent DOM element to append SVG to
   * @param options - string to select from
   */
  function svg(container, options) {
      if (options === undefined) {
          options = {};
      }
      if (options.height === undefined || options.width === undefined) {
          const bbox = container.getBoundingClientRect();
          options.height = bbox.height;
          options.width = bbox.width;
      }
      if (options.margin === undefined) {
          options.margin = { bottom: 10, left: 10, right: 10, top: 10 };
      }
      if (options.margin.top === undefined) {
          options.margin.top = 10;
      }
      if (options.margin.left === undefined) {
          options.margin.left = 10;
      }
      const ro = new ResizeObserver((entries, observer) => {
          const entry = entries[0];
          const { inlineSize: w, blockSize: h } = entry.contentBoxSize[0];
          if (options) {
              options.height = h;
              options.width = w;
          }
          svg.setAttributeNS(null, "height", `${h}`);
          svg.setAttributeNS(null, "width", `${w}`);
      });
      ro.observe(container, { box: "content-box" });
      const svg = document.createElementNS(NS.svg, "svg");
      svg.setAttributeNS(null, "x", "0");
      svg.setAttributeNS(null, "y", "0");
      svg.setAttributeNS(null, "height", `100%`);
      svg.setAttributeNS(null, "width", `100%`);
      svg.setAttributeNS(null, "viewBox", `0 0 ${options.width} ${options.height}`);
      svg.setAttributeNS(null, "preserveAspectRatio", "xMinYMin meet");
      svg.setAttributeNS(NS.xmlns, "xmlns", NS.svg);
      if (options.id) {
          svg.setAttributeNS(null, "id", options.id);
      }
      if (options.class) {
          svg.setAttributeNS(null, "class", options.class);
      }
      container.appendChild(svg);
      const defs = document.createElementNS(NS.svg, "defs");
      svg.appendChild(defs);
      const canvas = document.createElementNS(NS.svg, "g");
      canvas.setAttributeNS(null, "class", "canvas");
      canvas.setAttributeNS(null, "transform", `translate(${options.margin.left},${options.margin.top})`);
      svg.appendChild(canvas);
      return svg;
  }

  var Sankey = /** @class */ (function () {
      function Sankey(options) {
          this.container = document.querySelector("body");
          this.h = 200;
          this.links = [];
          this.margin = { bottom: 20, left: 20, right: 30, top: 20 };
          this.nodeMoveX = true;
          this.nodeMoveY = true;
          this.nodes = [];
          this.nodeSize = 20;
          this.orient = "horizontal";
          this.padding = 5;
          this.playback = false;
          this.rh = 160;
          this.rw = 150;
          this.w = 200;
          this._extent = [0, 0]; // min/max node values
          this._fp = new Intl.NumberFormat("en-GB", { style: "decimal" });
          this._id = "";
          this._linkGenerator = function () { return true; };
          this._layerGap = 0;
          this._totalLayers = 0;
          if (options.margin !== undefined) {
              var m = options.margin;
              m.left = isNaN(m.left) ? 0 : m.left;
              m.right = isNaN(m.right) ? 0 : m.right;
              m.top = isNaN(m.top) ? 0 : m.top;
              m.bottom = isNaN(m.bottom) ? 0 : m.bottom;
              this.margin = m;
          }
          if (options.container !== undefined) {
              this.container = options.container;
              var box = this.container.getBoundingClientRect();
              this.h = box.height;
              this.w = box.width;
              this.rh = this.h - this.margin.top - this.margin.bottom;
              this.rw = this.w - this.margin.left - this.margin.right;
          }
          if (options.padding !== undefined) {
              this.padding = options.padding;
          }
          if (options.nodeMoveX !== undefined) {
              this.nodeMoveX = options.nodeMoveX;
          }
          if (options.nodeMoveY !== undefined) {
              this.nodeMoveY = options.nodeMoveY;
          }
          if (options.nodeSize !== undefined) {
              this.nodeSize = options.nodeSize;
          }
          if (options.orient !== undefined) {
              this.orient = options.orient;
          }
          if (options.playback !== undefined) {
              this.playback = options.playback;
          }
          this.data(options.nodes, options.links)
              .initialise();
      }
      /**
       * Clears selection from Sankey
       */
      Sankey.prototype.clearSelection = function () {
          selectAll(".selected").classed("selected", false);
          return this;
      };
      /**
       * Saves data into Sankey
       * @param nodes - Sankey nodes
       * @param links - Sankey links
       */
      Sankey.prototype.data = function (nodes, links) {
          this._initDataStructure(nodes, links);
          return this;
      };
      /**
       * Removes this chart from the DOM
       */
      Sankey.prototype.destroy = function () {
          select(this.container).select("svg").remove();
          return this;
      };
      /**
       * draws the Sankey
       */
      Sankey.prototype.draw = function () {
          this._drawCanvas()
              ._drawNodes()
              ._drawLinks()
              ._drawLabels()
              ._drawPlayback();
          return this;
      };
      /**
       * Recalculate internal values
       */
      Sankey.prototype.initialise = function () {
          this._nodeValueLayer()
              ._scalingExtent()
              ._scaling()
              ._nodeSize()
              ._positionNodeByLayer()
              ._positionNodeInLayer()
              ._positionLinks();
          return this;
      };
      /**
       * Serialise the Sankey data
       */
      Sankey.prototype.toString = function () {
          var nodes = this.nodes.map(function (n) { return n.name + ": " + n.value + " (L: " + n.layer + ")"; }).join("\n");
          var links = this.links.map(function (l) { return l.nodeIn.name + "->" + l.nodeOut.name; }).join("\n");
          return "nodes:\n" + nodes + "\n\nlinks:\n" + links;
      };
      // ***** PRIVATE METHODS
      Sankey.prototype._drawCanvas = function () {
          var _this = this;
          this._id = "sankey" + Array.from(document.querySelectorAll(".sankey")).length;
          var sg = svg(this.container, {
              class: "sankey",
              height: this.h,
              id: this._id,
              margin: this.margin,
              width: this.w
          });
          var s = select(sg);
          s.on("click", function () { return _this.clearSelection(); });
          var defs = s.select("defs");
          var gb = defs.append("filter").attr("id", "blur");
          gb.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", 5);
          return this;
      };
      Sankey.prototype._drawLabels = function () {
          var _this = this;
          var canvas = select(this.container).select(".canvas");
          var nodes = canvas.selectAll("g.node");
          var fade = this.playback ? " shadow" : "";
          var outerLabel = nodes.append("text")
              .attr("class", function (d) { return "node-label outer" + (d.layer > 0 ? fade : ""); })
              .attr("dy", "0.35em")
              .attr("opacity", 0);
          if (this.orient === "horizontal") {
              outerLabel
                  .attr("x", function (d) { return d.x < (_this.rw / 2) ? _this.nodeSize + 6 : -6; })
                  .attr("y", function (d) { return d.h / 2; })
                  .attr("text-anchor", function (d) { return d.x + _this.nodeSize > _this.rw / 2 ? "end" : "start"; })
                  .style("opacity", function (d) { return d.h > 20 ? null : 0; })
                  .text(function (d) { return d.name; });
          }
          else {
              outerLabel
                  .attr("x", function (d) { return d.w / 2; })
                  .attr("y", function (d) { return d.y < (_this.rh / 2) ? _this.nodeSize + 10 : -10; })
                  .attr("text-anchor", "middle")
                  .text(function (d) { return d.w > d.name.length * 7 ? d.name : ""; });
          }
          var innerLabel = nodes.append("text")
              .attr("class", function (d) { return "node-label inner" + (d.layer > 0 ? fade : ""); })
              .attr("dy", "0.35em")
              .attr("text-anchor", "middle")
              .attr("opacity", 0);
          if (this.orient === "horizontal") {
              innerLabel
                  .attr("x", function (d) { return -d.h / 2; })
                  .attr("y", function () { return _this.nodeSize / 2; })
                  .attr("transform", "rotate(270)")
                  .text(function (d) { return d.h > 50 ? _this._fp.format(d.value) : ""; });
          }
          else {
              innerLabel
                  .attr("x", function (d) { return d.w / 2; })
                  .attr("y", function () { return _this.nodeSize / 2; })
                  .text(function (d) { return d.w > 50 ? _this._fp.format(d.value) : ""; });
          }
          if (this.orient === "horizontal") {
              outerLabel.style("opacity", function (d) { return d.h > 50 ? 1 : 0; });
              innerLabel.style("opacity", function (d) { return d.h > 50 ? 1 : 0; });
          }
          else {
              outerLabel.style("opacity", function (d) { return d.w > 50 ? 1 : 0; });
              innerLabel.style("opacity", function (d) { return d.w > 50 ? 1 : 0; });
          }
          return this;
      };
      Sankey.prototype._drawLinks = function () {
          var _this = this;
          var svg = select(this.container).select("svg");
          var canvas = svg.select(".canvas");
          var fade = this.playback ? " shadow" : "";
          if (this.orient === "horizontal") {
              this._linkGenerator = linkHorizontal()
                  .source(function (d) { return [d.nodeIn.x + _this.nodeSize, d.y0]; })
                  .target(function (d) { return [d.nodeOut.x, d.y1]; })
                  .x(function (d) { return d[0]; })
                  .y(function (d) { return d[1]; });
          }
          else {
              this._linkGenerator = linkVertical()
                  .source(function (d) { return [d.y0, d.nodeIn.y + _this.nodeSize]; })
                  .target(function (d) { return [d.y1, d.nodeOut.y]; })
                  .x(function (d) { return d[0]; })
                  .y(function (d) { return d[1]; });
          }
          var links = canvas.append("g")
              .attr("class", "links")
              .selectAll("g")
              .data(this.links).enter()
              .append("g")
              .attr("id", function (d) { return _this._id + "_" + d.id; })
              .attr("class", "link" + fade)
              .on("click", function (event) { return _this._linkClickHandler(event); });
          this.links.forEach(function (lk) {
              lk.dom = document.getElementById(_this._id + "_" + lk.id);
          });
          selectAll("g.links").lower();
          var path = links
              .append("path")
              .attr("id", function (d) { return _this._id + "_p" + d.id; })
              .attr("class", "link")
              .attr("stroke", function (d) { return d.fill ? d.fill : d.nodeIn.fill; })
              .attr("stroke-width", function (d) { return d.w; })
              .attr("fill", "none");
          links.append("title")
              .text(function (d) { return d.nodeIn.name + " -> " + d.nodeOut.name + " - " + _this._fp.format(d.value); });
          path.attr("d", function (d) { return _this._linkGenerator(d); });
          return this;
      };
      Sankey.prototype._drawNodes = function () {
          var _this = this;
          var self = this;
          var svg = select(this.container).select("svg");
          var canvas = svg.select(".canvas");
          var fade = this.playback ? " shadow" : "";
          var nodes = canvas.append("g")
              .attr("class", "nodes")
              .selectAll("g.node")
              .data(this.nodes).enter()
              .append("g")
              .attr("id", function (d) { return _this._id + "_" + d.id; })
              .attr("class", function (d) { return "node" + (d.layer > 0 ? fade : ""); })
              .attr("transform", function (d) {
              return _this.orient === "horizontal"
                  ? "translate(" + d.x + "," + -d.h + ")"
                  : "translate(" + -d.w + "," + d.y + ")";
          })
              .call(
          // @ts-ignore
          drag().clickDistance(1)
              .on("start", dragstart)
              .on("drag", dragmove)
              .on("end", dragend))
              .on("click", function (event) { return _this._nodeClickHandler(event); });
          this.nodes.forEach(function (node) {
              node.dom = document.getElementById(_this._id + "_" + node.id);
          });
          select("g.nodes").raise();
          var rect = nodes.append("rect")
              .attr("id", function (d) { return _this._id + "_r" + d.id; })
              .attr("class", "node")
              .attr("height", function (d) { return d.h + "px"; })
              .attr("width", function (d) { return d.w + "px"; })
              .attr("fill", function (d) { return d.fill; })
              .attr("x", 0)
              .attr("y", 0)
              .attr("opacity", 1);
          nodes.append("rect")
              .attr("class", "shadow node")
              .attr("height", function (d) { return (_this.playback ? d.h : 0) + "px"; })
              .attr("width", function (d) { return (_this.playback ? d.w : 0) + "px"; })
              .attr("x", 0)
              .attr("y", 0);
          nodes
              .attr("transform", function (d) { return "translate(" + d.x + " " + d.y + ")"; });
          nodes.append("title")
              .text(function (d) { return d.name + " - " + _this._fp.format(d.value); });
          function dragstart(event, d) {
              if (!d.__x) {
                  d.__x = event.x;
              }
              if (!d.__y) {
                  d.__y = event.y;
              }
              if (!d.__x0) {
                  d.__x0 = d.x;
              }
              if (!d.__y0) {
                  d.__y0 = d.y;
              }
          }
          function dragmove(event, d) {
              select(this)
                  .attr("transform", function (d) {
                  var dx = event.x - d.__x;
                  var dy = event.y - d.__y;
                  // x direction
                  if (self.nodeMoveX) {
                      d.x = d.__x0 + dx;
                      if (d.x < 0) {
                          d.x = 0;
                      }
                  }
                  // y direction
                  if (self.nodeMoveY) {
                      d.y = d.__y0 + dy;
                      if (d.y < 0) {
                          d.y = 0;
                      }
                  }
                  return "translate(" + d.x + ", " + d.y + ")";
              });
              self._positionLinks();
              selectAll("path.link")
                  .attr("d", function (d) { return self._linkGenerator(d); });
          }
          function dragend(event, d) {
              delete d.__x;
              delete d.__y;
              delete d.__x0;
              delete d.__x1;
              delete d.__y0;
              delete d.__y1;
          }
          return this;
      };
      Sankey.prototype._drawPlayback = function () {
          var _this = this;
          if (this.playback) {
              this.nodes.forEach(function (node) {
                  if (node.story && node.linksOut.length > 0) {
                      var c = select(node.dom).append("circle")
                          .attr("class", "playback-prompt")
                          .attr("cx", node.w / 2)
                          .attr("cy", node.h / 2)
                          .attr("filter", "url(#blur)")
                          .attr("r", 0)
                          .on("click", function (event) { return _this._playbackClickHandler(event); });
                      c.append("title").text("View notes about this flow stage");
                      c.attr("r", 15);
                  }
              });
          }
          return this;
      };
      /**
       * Creates the initial data structures
       */
      Sankey.prototype._initDataStructure = function (nodes, links) {
          var _this = this;
          nodes.forEach(function (node, i) {
              var n = node;
              n.h = 0; // height
              n.id = i + 1;
              n.layer = -1; // denotes membership to a visual grouping
              n.linksIn = []; // replaces source in other sankey models
              n.linksOut = []; // ditto target
              n.w = 0; // width
              n.x = 0; // position onscreen
              n.y = 0;
              _this.nodes.push(n);
          });
          links.forEach(function (link, i) {
              var l = link;
              l.nodeIn = _this.nodes[link.source]; // replaces source in other sankey models
              l.nodeOut = _this.nodes[link.target]; // ditto target
              l.id = "L" + (i + 1);
              l.w = 0; // width
              l.y0 = 0; // value at source node (horizontal: top right y, vertical: bottom left x)
              l.y1 = 0; // value at target node (horizontal: bottom left y, vertical; top right x)
              _this.links.push(l);
              _this.links[i].nodeIn.linksOut.push(_this.links[i]);
              _this.links[i].nodeOut.linksIn.push(_this.links[i]);
          });
      };
      Sankey.prototype._linkClickHandler = function (event) {
          var el = event.target;
          event.stopPropagation();
          this.clearSelection();
          window.dispatchEvent(new CustomEvent("link-selected", { detail: el }));
          select(el).classed("selected", true);
      };
      Sankey.prototype._nodeClickHandler = function (event) {
          var el = event.target;
          event.stopPropagation();
          this.clearSelection();
          var activeNode = select(el);
          var dt = activeNode.datum();
          window.dispatchEvent(new CustomEvent("node-selected", { detail: el }));
          dt.linksIn.forEach(function (link) {
              select(link.dom).select("path").classed("selected", true);
          });
          dt.linksOut.forEach(function (link) {
              select(link.dom).select("path").classed("selected", true);
          });
      };
      Sankey.prototype._playbackClickHandler = function (event) {
          var _this = this;
          event.stopPropagation();
          var el = event.target;
          this.clearSelection();
          var button = select(el);
          button
              .attr("r", 0)
              .remove();
          var activeNode = select(el.parentNode);
          var dt = activeNode.datum();
          var narrate = [];
          if (dt.story) {
              narrate.push(dt);
          }
          if (dt.linksOut.length > 0) {
              dt.linksOut.forEach(function (link) {
                  select(link.dom).classed("shadow", false);
                  if (link.story) {
                      narrate.push(link);
                  }
              });
              this.nodes.forEach(function (node) {
                  var sum = 0, breakdown = false;
                  if (node.linksIn.length > 0 || node === dt) {
                      node.linksIn.forEach(function (link) {
                          if (select(link.dom).classed("shadow")) {
                              sum += link.value;
                          }
                          else {
                              breakdown = true;
                          }
                      });
                      if (breakdown || (node === dt && node.linksIn.length === 0)) {
                          sum = _this._scale(sum);
                          sum = sum >= 0 ? sum : 0;
                          var shadow = select(node.dom).select(".shadow");
                          if (_this.orient === "horizontal") {
                              shadow
                                  .attr("height", sum + "px");
                          }
                          else {
                              var x = parseFloat(select(node.dom).attr("x"));
                              shadow
                                  .attr("width", sum + "px")
                                  .attr("x", x + sum);
                          }
                          if (sum === 0) {
                              shadow.remove();
                          }
                      }
                  }
              });
          }
          window.dispatchEvent(new CustomEvent("node-playback", { detail: narrate }));
      };
      /**
       * Sets height and width of node
       */
      Sankey.prototype._nodeSize = function () {
          var _this = this;
          this.nodes.forEach(function (node) {
              if (_this.orient === "horizontal") {
                  node.h = Math.max(1, _this._scale(node.value));
                  node.w = _this.nodeSize;
              }
              else {
                  node.h = _this.nodeSize;
                  node.w = Math.max(1, _this._scale(node.value));
              }
          });
          return this;
      };
      /**
       * Determines each node dimension and layer attribution and finally determines node order within layer
       */
      Sankey.prototype._nodeValueLayer = function () {
          var track = new Map();
          var max = 0;
          this.nodes.forEach(function (node) {
              // calculate value if not already provided
              if (node.value === undefined) {
                  node.value = Math.max(1, node.linksIn.map(function (link) { return link.value; }).reduce(function (ac, s) { return ac + s; }, 0), node.linksOut.map(function (link) { return link.value; }).reduce(function (ac, s) { return ac + s; }, 0));
              }
              // calculate layer value
              if (node.linksIn.length === 0) {
                  node.layer = 0;
                  track.set(node.id, []);
              }
              node.linksOut.forEach(function (link) {
                  if (track.has(link.nodeOut.id)) {
                      var parent_1 = track.get(node.id);
                      if (parent_1.findIndex(function (e) { return e === link.nodeOut.id; }) === -1) {
                          link.nodeOut.layer = node.layer + 1;
                          var a = track.get(link.nodeOut.id);
                          a.push(node.id);
                          track.set(link.nodeOut.id, a);
                      }
                  }
                  else {
                      link.nodeOut.layer = node.layer + 1;
                      track.set(link.nodeOut.id, [node.id]);
                  }
                  max = link.nodeOut.layer > max ? link.nodeOut.layer : max;
              });
          });
          this._totalLayers = max;
          this._layerGap = (this.orient === "horizontal" ? this.rw : this.rh) / this._totalLayers;
          // sort: by layer asc then by size then by a-z name
          this.nodes.sort(function (a, b) { return a.layer - b.layer || b.value - a.value || (b.name > a.name ? -1 : 1); });
          return this;
      };
      /**
       * Positions links relative to sourcec and destination nodes
       */
      Sankey.prototype._positionLinks = function () {
          var _this = this;
          // sort: by size then by a-z name
          this.links.sort(function (a, b) { return b.value - a.value || (b.nodeIn.name > a.nodeIn.name ? -1 : 1); });
          var source = new Map();
          var target = new Map();
          this.links.forEach(function (link) {
              var src = 0, tgt = 0;
              link.w = Math.max(1, _this._scale(link.value));
              if (!source.has(link.nodeIn.id)) {
                  source.set(link.nodeIn.id, (_this.orient === "horizontal") ? link.nodeIn.y : link.nodeIn.x);
              }
              if (!target.has(link.nodeOut.id)) {
                  target.set(link.nodeOut.id, (_this.orient === "horizontal") ? link.nodeOut.y : link.nodeOut.x);
              }
              src = source.get(link.nodeIn.id);
              link.y0 = src + (link.w / 2);
              tgt = target.get(link.nodeOut.id);
              link.y1 = tgt + (link.w / 2);
              source.set(link.nodeIn.id, link.y0 + (link.w / 2));
              target.set(link.nodeOut.id, link.y1 + (link.w / 2));
          });
          return this;
      };
      /**
       * spreads the nodes across the chart space by layer
       */
      Sankey.prototype._positionNodeByLayer = function () {
          var _this = this;
          if (this.orient === "horizontal") {
              this.nodes.forEach(function (node) {
                  node.x = node.layer * _this._layerGap;
                  if (node.x >= _this.rw) {
                      node.x -= _this.nodeSize;
                  }
                  else if (node.x < 0) {
                      node.x = 0;
                  }
              });
          }
          else {
              this.nodes.forEach(function (node) {
                  node.y = node.layer * _this._layerGap;
                  if (node.y >= _this.rh) {
                      node.y -= _this.nodeSize;
                  }
                  else if (node.y < 0) {
                      node.y = 0;
                  }
              });
          }
          return this;
      };
      /**
       * spreads the nodes within layer
       */
      Sankey.prototype._positionNodeInLayer = function () {
          var _this = this;
          var layer = -1, n = 0;
          var layerTracker = [];
          if (this.orient === "horizontal") {
              this.nodes.forEach(function (node) {
                  if (layer === node.layer) {
                      node.y = n;
                      n += node.h + _this.padding;
                      layerTracker[layer].sum = n;
                      layerTracker[layer].nodes.push(node);
                  }
                  else {
                      layer = node.layer;
                      node.y = 0;
                      n = node.h + _this.padding;
                      layerTracker.push({ nodes: [node], sum: n, total: _this.rh });
                  }
              });
          }
          else {
              this.nodes.forEach(function (node) {
                  if (layer === node.layer) {
                      node.x = n;
                      n += node.w + _this.padding;
                      layerTracker[layer].sum = n;
                      layerTracker[layer].nodes.push(node);
                  }
                  else {
                      layer = node.layer;
                      node.x = 0;
                      n = node.w + _this.padding;
                      layerTracker.push({ nodes: [node], sum: n, total: _this.rw });
                  }
              });
          }
          // 2nd pass to widen out layers too tightly clustered together
          layerTracker.forEach(function (layer) {
              if (layer.sum * 1.2 < layer.total && layer.nodes.length > 1) {
                  var customPad_1 = ((layer.total - layer.sum) * 0.75) / layer.nodes.length;
                  layer.nodes.forEach(function (node, i) {
                      if (_this.orient === "horizontal") {
                          node.y += (i + 1) * customPad_1;
                      }
                      else {
                          node.x += (i + 1) * customPad_1;
                      }
                  });
              }
          });
          return this;
      };
      /**
       * Calculates the chart scale
       */
      Sankey.prototype._scaling = function () {
          var rng = [0, this.orient === "horizontal" ? this.rh : this.rw];
          this._scale = linear$1().domain(this._extent).range(rng);
          return this;
      };
      /**
       * Determines the minimum and maximum extent values to scale nodes by
       */
      Sankey.prototype._scalingExtent = function () {
          this._extent[0] = this.nodes.reduce(function (ac, n) { return (ac === undefined || n.value < ac) ? n.value : ac; }, 0);
          var max = this._extent[0], layer = 0, runningTotal = 0;
          this.nodes.forEach(function (node) {
              if (node.layer === layer) {
                  runningTotal += node.value;
              }
              else {
                  layer = node.layer;
                  max = runningTotal > max ? runningTotal : max;
                  runningTotal = node.value;
              }
          });
          this._extent[1] = (runningTotal > max ? runningTotal : max) + (this.padding * (this.nodes.length * 2.5));
          return this;
      };
      return Sankey;
  }());

  exports.Sankey = Sankey;

  return exports;

}({}));
