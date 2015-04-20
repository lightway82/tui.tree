/**
 * @fileoverview 화면에 보여지는 트리를 그리고, 갱신한다.
 * @author FE개발팀 이제인(jein.yi@nhnent.com)
 */
(function(ne) {

    var STATE = {
        NORMAL: 0,
        EDITABLE: 1
    };

    var DEFAULT = {
        OPEN: ['open', '-'],
        CLOSE: ['close', '+'],
        SELECT_CLASS: 'selected',
        SUBTREE_CLASS: 'Subtree',
        VALUE_CLASS: 'valueClass',
        EDITABLE_CLASS: 'editableClass',
        TEMPLATE: {
            EDGE_NODE: '<li class="edge_node {{State}}">' +
                        '<button type="button">{{StateLabel}}</button>' +
                        '<span id="{{NodeID}}" class="depth{{Depth}} {{ValueClass}}">{{Title}}</span><em>{{DepthLabel}}</em>' +
                        '<ul class="{{Subtree}}" style="display:{{Display}}">{{Children}}</ul>' +
                    '</li>',
            LEAP_NODE: '<li class="leap_node">' +
                        '<span id="{{NodeID}}" class="depth{{Depth}} {{ValueClass}}">{{Title}}</span><em>{{DepthLabel}}</em>' +
                    '</li>'
        },
        USE_DRAG: false,
        USE_HELPER: false,
        HELPER_POS : {
            x: 10,
            y: 10
        }
    };

    /**
     * 트리 컴포넌트에 쓰이는 헬퍼객체
     *
     * @author FE개발팀 이제인(jein.yi@nhnent.com)
     */
    var util = {
        /**
         * 엘리먼트에 이벤트를 추가한다
         *
         * @param {Object} element 이벤트를 추가할 엘리먼트
         * @param {String} eventName 추가할 이벤트 명
         * @param {Function} handler 추가할 이벤트 콜백함수
         */
        addEventListener: function(element, eventName, handler) {
            if (element.addEventListener) {
                element.addEventListener(eventName, handler, false);
            } else {
                element.attachEvent('on' + eventName, handler);
            }
        },

        /**
         * 엘리먼트에 이벤트를 제거한다
         *
         * @param {Object} element 이벤트를 제거할 엘리먼트
         * @param {String} eventName 제거할 이벤트 명
         * @param {Function} handler 제거할 이벤트 콜백함수
         */
        removeEventListener: function(element, eventName, handler) {
            if (element.removeEventListener) {
                element.removeEventListener(eventName, handler, false);
            } else {
                element.detachEvent('on' + eventName, handler);
            }
        },

        /**
         * 이벤트 객체의 타겟을 반환한다
         * @param {event} e 이벤트객체
         * @return {HTMLElement} 타겟 엘리먼트
         */
        getTarget: function(e) {
            e = e || window.event;
            var target = e.target || e.srcElement;
            return target;
        },

        /**
         * 엘리먼트가 특정 클래스를 가지고 있는지 확인
         * @param {HTMLElement} element 확인할 엘리먼트
         * @param {string} className 확인할 클래스 명
         * @return {boolean} 클래스 포함 여부
         */
        hasClass: function(element, className) {
            if (!element || !className) {
                throw new Error('#util.hasClass(element, className) 엘리먼트가 입력되지 않았습니다. \n__element' + element + ',__className' + className);
            }

            var cls = element.className;

            if (cls.indexOf(className) !== -1) {
                return true;
            }

            return false;
        },

        /**
         * 클래스에 따른 엘리먼트 찾기
         * @param {HTMLElement} target 대상 엘리먼트
         * @param {string} className
         * @return {array} 클래스를 가진 앨리먼트
         */
        getElementsByClass: function(target, className) {
            if (target.querySelectorAll) {
                return target.querySelectorAll('.' + className);
            }
            var all = target.getElementsByTagName('*'),
                filter = [];

            all = ne.util.toArray(all);

            ne.util.forEach(all, function(el) {
                var cls = el.className || '';
                if (cls.indexOf(className) !== -1) {
                    filter.push(el);
                }
            });

            return filter;
        },

        /**
         * 우클릭인지 확인
         * @param {event} e 확인 이벤트
         * @return {boolean} 우클릭 여부
         */
        isRightButton: function(e) {
            var isRight = util._getButton(e) === 2;
            return isRight;
        },

        /**
         * 속성 존재 여부 테스트
         * @param {array} props 속성 리스트
         * @return {boolean} 속성 존재여부
         */
        testProp: function(props) {
            var style = document.documentElement.style,
                i = 0;

            for (; i < props.length; i++) {
                if (props[i] in style) {
                    return props[i];
                }
            }
            return false;
        },

        /**
         * 이벤트 기본 동작 방해
         * @param {event} e 이벤트
         */
        preventDefault: function(e) {
            if (e.preventDefault) {
                e.preventDefault();
            } else {
                e.returnValue = false;
            }
        },

        /**
         * 마우스 이벤트에서 버튼 클릭 속성을 정규화한다
         * 0: 우선적 마우스 버튼, 2: 두 번째 마우스 버튼, 1: 가운데 버튼
         * @param {MouseEvent} event 이벤트 객체
         * @return {number|undefined} 넘버 객체
         * @private
         */
        _getButton: function(e) {
            var button,
                primary = '0,1,3,5,7',
                secondary = '2,6',
                wheel = '4';

            if (document.implementation.hasFeature('MouseEvents', '2.0')) {
                return e.button;
            } else {
                button = e.button + '';
                if (primary.indexOf(button) > -1) {
                    return 0;
                } else if (secondary.indexOf(button) > -1) {
                    return 2;
                } else if (wheel.indexOf(button) > -1) {
                    return 1;
                }
            }
        }
    };

    /**
     * 트리의 모델을 생성하고 모델에 데이터를 부여한다.
     * 이름이 변경될 때 사용된 인풋박스를 생성한다.
     * 모델에 뷰를 등록시킨다.
     * 트리의 뷰를 생성하고 이벤트를 부여한다.
     * @constructor ne.component.Tree
     * @param {string} id 트리가 붙을 앨리먼트의 아이디
     *      @param {Object} data 트리에 사용될 데이터
     *      @param {Object} options 트리에 사용될 세팅값
     *          @param {String} options.modelOption 모델이 들어갈 옵션 값
     *          @param {object} [options.template] 트리에 사용되는 기본 마크업
     *          @param {Array} [options.openSet] 노드가 열린 상태일때 클래스 명과 버튼 레이블
     *          @param {Array} [options.closeSet] 노드가 닫힌 상태일때 클래스 명과 버튼 레이블
     *          @param {string} [options.selectClass] 선택된 노드에 부여되는 클래스 명
     *          @param {string} [options.valueClass] 더블클릭이 되는 영역에 부여되는 클래스 명
     *          @param {string} [options.inputClass] input엘리먼트에 부여되는 클래스 명
     *          @param {string} [options.subtreeClass] 서브트리에 부여되는 클래스 명
     *          @param {Array} [options.depthLabels] 뷰에만 표시 될 기본 레이블
     *          @param {object} [options.helperPos] 헬퍼객체가 표시되는 위치의 상대값 좌표
     * @example
     * var data = [
     {title: 'rootA', children:
             [
                 {title: 'root-1A'}, {title: 'root-1B'},{title: 'root-1C'}, {title: 'root-1D'},
                 {title: 'root-2A', children: [
                     {title:'sub_1A', children:[{title:'sub_sub_1A'}]}, {title:'sub_2A'}
                 ]}, {title: 'root-2B'},{title: 'root-2C'}, {title: 'root-2D'},
                 {title: 'root-3A',
                     children: [
                         {title:'sub3_a'}, {title:'sub3_b'}
                     ]
                 }, {title: 'root-3B'},{title: 'root-3C'}, {title: 'root-3D'}
             ]
     },
     {title: 'rootB', children: [
         {title:'B_sub1'}, {title:'B_sub2'}, {title:'b'}
     ]}
     ];

     var tree1 = new ne.component.Tree('id', data ,{
            modelOption: {
                defaultState: 'open'
            }
        });
    });
     **/
    window.ne = ne = ne || {};
    ne.component = ne.component || {};

    ne.component.Tree = ne.util.defineClass(/** @lends ne.component.Tree.prototype */{

        /**
         * TreeView 초기화한다.
         *
         * @param {String} id 루트의 아이디 값
         * @param {Object} data 트리 초기데이터 값
         * @param {Object} options 트리 초기옵션값
         * @param {String} template 트리에 사용되는 기본 태그(자식노드가 있을때와 없을때를 오브젝트 형태로 받는)
         */
        init: function (id, data, options) {

            /**
             * 노드 기본 템플릿
             * @type {String}
             */
            this.template = options.template || DEFAULT.TEMPLATE;

            /**
             * 노드의 루트 엘리먼트
             * @type {HTMLElement}
             */
            this.root = null;

            /**
             * 트리가 열린 상태일때 부여되는 클래스와, 텍스트
             * @type {Array}
             */
            this.openSet = options.openSet || DEFAULT.OPEN;

            /**
             * 트리가 닫힘 상태일때 부여되는 클래스와, 텍스트
             * @type {Array}
             */
            this.closeSet = options.closeSet || DEFAULT.CLOSE;

            /**
             * 노드가 선택 되었을때 부여되는 클래스명
             * @type {String}
             */
            this.onselectClass = options.selectClass || DEFAULT.SELECT_CLASS;

            /**
             * 더블클릭이 적용되는 영역에 부여되는 클래스
             * @type {string}
             */
            this.valueClass = options.valueClass || DEFAULT.VALUE_CLASS;

            /**
             * input엘리먼트에 부여되는 클래스
             * @type {string}
             */
            this.editClass = options.inputClass || DEFAULT.EDITABLE_CLASS;

            /**
             * 노드의 뎁스에따른 레이블을 관리한다.(화면에는 표시되지만 모델에는 영향을 끼치지 않는다.)
             * @type {Array}
             */
            this.depthLabels = options.depthLabels || [];

            /**
             * 트리 상태, 일반 출력 상태와 수정가능 상태가 있음.
             * @type {number}
             */
            this.state = STATE.NORMAL;

            /**
             * 트리 서브 클래스
             * @type {string|*}
             */
            this.subtreeClass = options.subtreeClass || DEFAULT.SUBTREE_CLASS;

            /**
             * 드래그앤 드롭 기능을 사용할것인지 여부
             * @type {boolean|*}
             */
            this.useDrag = options.useDrag || DEFAULT.USE_DRAG;

            /**
             * 드래그앤 드롭 기능 동작시 가이드 엘리먼트 활성화 여부
             * @type {boolean|*}
             */
            this.useHelper = this.useDrag && (options.useHelper || DEFAULT.USE_HELPER);

            /**
             * 헬퍼객체의 기준 위치를 설정한다.
             * @type {object}
             */
            this.helperPos = options.helperPos || DEFAULT.HELPER_POS;

            /**
             * 트리의 상태가 STATE.EDITABLE 일때, 노드에 붙는 input엘리먼트
             * @type {HTMLElement}
             */
            this.inputElement = this.getEditableElement();

            /**
             * 트리 모델을 생성한다.
             * @type {ne.component.Tree.TreeModel}
             */
            this.model = new ne.component.Tree.TreeModel(options.modelOption, this);

            // 모델 데이터를 생성한다.
            this.model.setData(data);

            if (id) {
                this.root = document.getElementById(id);
            } else {
                this.root = document.createElement('ul');
                document.body.appendChild(this.root);
            }

            this._draw(this._getHtml(this.model.treeHash.root.childKeys));
            this.setEvents();

        },

        /**
         * STATE.EDITABLE 일때 사용되는  inputElement를 만든다.
         * @return {HTMLElement} input 생성된 input 앨리먼트
         */
        getEditableElement: function() {
            var input = document.createElement('input');
            input.className = this.editClass;
            input.setAttribute('type', 'text');

            return input;
        },

        /**
         * 트리에 걸리는 이벤트 핸들러를 할당한다.
         * #click-버튼 : 트리의 상태를 변경한다.
         * #click-노드 : 노드를 선택한다
         * #doubleclick-노드 : 노드의 이름변경을 활성화 한다.
         * #mousedown : 마우스 무브와 업을 건다
         * #mousemove : 마우스 이동을 체크
         * #mouseup : 마우스를 떼었을 경우, 마우스 move와 다운을 없앤다.
         */
        setEvents: function() {

            util.addEventListener(this.root, 'click', ne.util.bind(this._onClick, this));
            util.addEventListener(this.inputElement, 'blur', ne.util.bind(this._onBlurInput, this));
            util.addEventListener(this.inputElement, 'keyup', ne.util.bind(this._onKeyup, this));

            if (this.useDrag) {
                this._addDragEvent();
            }
        },

        /**
         * 드래그앤 드롭 이벤트를 건다.
         * @private
         */
        _addDragEvent: function() {
            var userSelectProperty = util.testProp(['userSelect', 'WebkitUserSelect', 'OUserSelect', 'MozUserSelect', 'msUserSelect']);
            var isSupportSelectStart = 'onselectstart' in document;
            if (isSupportSelectStart) {
                util.addEventListener(this.root, 'selectstart', util.preventDefault);
            } else {
                var style = document.documentElement.style;
                style[userSelectProperty] = 'none';
            }
            util.addEventListener(this.root, 'mousedown', ne.util.bind(this._onMouseDown, this));
        },

        /**
         * 엔터키를 입력 할 시, 모드 변경
         * @private
         */
        _onKeyup: function(e) {
            if (e.keyCode === 13) {
                var target = util.getTarget(e);
                this.model.rename(this.current.id, target.value);
                this.changeState(this.current);
            }
        },

        /**
         * 노드명 변경 후, 포커스 아웃 될때 발생되는 이벤트 핸들러
         * @param {event} e
         * @private
         */
        _onBlurInput: function(e) {
            if (this.state === STATE.NORMAL) {
                return;
            }
            var target = util.getTarget(e);
            this.model.rename(this.current.id, target.value);
            this.changeState(this.current);
        },

        /**
         * 클릭 이벤트가 발생 할 경우, 더블클릭을 발생 시킬지, 클릭을 발생 시킬지 판단한다.
         * @param {event} e
         * @private
         */
        _onClick: function(e) {
            var target = util.getTarget(e);

            // 우클릭은 막는다.
            if (util.isRightButton(e)) {
                this.clickTimer = null;
                return;
            }

            if (!util.hasClass(target, this.valueClass)) {
                this._onSingleClick(e);
                return;
            }

            if (this.clickTimer) {
                this._onDoubleClick(e);
                window.clearTimeout(this.clickTimer);
                this.clickTimer = null;
            } else {
                // value 부분을 클릭 했을시, 더블클릭 타이머를 돌린다.
                this.clickTimer = setTimeout(ne.util.bind(function() {
                    this._onSingleClick(e);
                }, this), 400);
            }
        },

        /**
         * 단일 클릭 처리, 버튼일 경우와 노드일 경우처리를 따로한다.
         * @param {event} e
         * @private
         */
        _onSingleClick: function(e) {

            this.clickTimer = null;

            var target = util.getTarget(e),
                tag = target.tagName.toUpperCase(),
                parent = target.parentNode,
                valueEl = util.getElementsByClass(parent, this.valueClass)[0];

            if (tag === 'INPUT') {
                return;
            }

            if (tag === 'BUTTON') {
                this.model.changeState(valueEl.id);
            } else {
                this.model.setBuffer(valueEl.id);
            }
        },

        /**
         * 상태를 변경한다. STATE.NORMAL | STATE.EDITABLE
         * @param {HTMLelement} target 엘리먼트
         */
        changeState: function(target) {

            if (this.state === STATE.EDITABLE) {
                this.state = STATE.NORMAL;
                this.action('restore', target);
            } else {
                this.state = STATE.EDITABLE;
                this.action('convert', target);
            }

        },

        /**
         * 더블 클릭 처리
         * @param {event} e
         * @private
         */
        _onDoubleClick: function(e) {
            var target = util.getTarget(e);
            this.changeState(target);
        },

        /**
         * 트리에 마우스 다운시 이벤트 핸들러.
         * @private
         */
        _onMouseDown: function(e) {

            if (this.state === STATE.EDITABLE || util.isRightButton(e)) {
                return;
            }

            util.preventDefault(e);

            var target = util.getTarget(e),
                tag = target.tagName.toUpperCase();

            if (tag === 'BUTTON' || tag === 'INPUT' || !util.hasClass(target, this.valueClass)) {
                return;
            }

            this.pos = this.root.getBoundingClientRect();

            // 가이드를 사용하면 가이드 엘리먼트를 띄운다.
            if (this.useHelper) {
                this.enableHelper({
                    x: e.clientX - this.pos.left,
                    y: e.clientY - this.pos.top
                }, target.innerText || target.textContent);
            }

            this.move = ne.util.bind(this._onMouseMove, this);
            this.up = ne.util.bind(this._onMouseUp, this, target);

            util.addEventListener(document, 'mousemove', this.move);
            util.addEventListener(document, 'mouseup', this.up);
        },

        /**
         * 마우스 이동
         * @param {event} me
         * @private
         */
        _onMouseMove: function(me) {
            // 가이드 이동'
            if (!this.useHelper) {
                return;
            }
            this.setHelperLocation({
                x: me.clientX - this.pos.left,
                y: me.clientY - this.pos.top
            });
        },

        /**
         * 마우스 업 이벤트 핸들러
         * @param {HTMLElement} target 마우스 다운의 타겟 엘리먼트
         * @param {event} ue
         * @private
         */
        _onMouseUp: function(target, ue) {
            // 가이드 감춤
            this.disableHelper();

            var toEl = util.getTarget(ue),
                model = this.model,
                node = model.find(target.id),
                toNode = model.find(toEl.id),
                isDisable = model.isDisable(toNode, node);

            if (model.find(toEl.id) && toEl.id !== target.id && !isDisable) {
                model.move(target.id, node, toEl.id);
            }

            util.removeEventListener(document, 'mousemove', this.move);
            util.removeEventListener(document, 'mouseup', this.up);
        },

        /** 
         * 트리 드래그 앤 드롭하는 엘리먼트의 value값을 보여주는 가이드 엘리먼트를 활성화 한다.
         * @param {object} pos 클릭한 좌표 위치
         * @param {string} value 클릭한 앨리먼트 텍스트 값
         */
        enableHelper: function(pos, value) {
            if (!this.helperElement) {
                this.helperElement = document.createElement('span');
                this.helperElement.style.position = 'absolute';
                this.helperElement.style.display = 'none';
                this.root.parentNode.appendChild(this.helperElement);
            }

            this.helperElement.innerHTML = value;
        },

        /**
         * 가이드의 위치를 변경한다.
         * @param {object} pos 변경할 위치
         */
        setHelperLocation: function(pos) {

            this.helperElement.style.left = pos.x + this.helperPos.x + 'px';
            this.helperElement.style.top = pos.y + this.helperPos.y + 'px';
            this.helperElement.style.display = 'block';

        },

        /**
         * 가이드를 감춘다
         */
        disableHelper: function() {
            if (this.helperElement) {
                this.helperElement.style.display = 'none';
            }
        },

        /**
         * 트리의 전체 혹은 일부 html 을 생성한다.
         * @param {Object} data 화면에 그릴 데이터
         * @param {Path} beforePath 부분트리를 그릴때 상위 패스정보
         * @return {String} html
         * @private
         */
        _getHtml: function(keys) {

            var model = this.model,
                html,
                childEl = [],
                node,
                tmpl,
                depth,
                state,
                label,
                rate,
                map;

            ne.util.forEach(keys, function(el) {
                node = model.find(el);
                depth = node.depth;
                state = this[node.state + 'Set'][0];
                label = this[node.state + 'Set'][1];
                rate = this.depthLabels[depth - 1] || '';
                map = {
                    State: state,
                    StateLabel: label,
                    NodeID: node.id,
                    Depth: depth,
                    Title: node.value,
                    ValueClass: this.valueClass,
                    SubTree: this.subtreeClass,
                    Display: (node.state === 'open') ? '' : 'none',
                    DepthLabel: rate
                };

                if (ne.util.isNotEmpty(node.childKeys)) {
                    tmpl = this.template.EDGE_NODE;
                    map.Children = this._getHtml(node.childKeys);
                } else {
                    tmpl = this.template.LEAP_NODE;
                }

                // {{}} 로 감싸진 내용 변경
                el = tmpl.replace(/\{\{([^\}]+)\}\}/g, function(matchedString, name) {
                    return map[name] || '';
                });

                childEl.push(el);
            }, this);

            html = childEl.join('');

            return html;
        },

        /**
         * 뷰를 갱신한다.
         * @param {string} act
         * @param {object} target
         */
        notify: function(act, target) {
            this.action(act, target);
        },

        /**
         * 액션을 수행해 트리를 갱신한다.
         * @param {String} type 액션 타입
         * @param {Object} target 부분갱신이라면 그 타겟
         */
        action: function(type, target) {
            this._actionMap = this._actionMap || {
                refresh: this._refresh,
                rename: this._rename,
                toggle: this._toggleNode,
                select: this._select,
                unselect: this._unSelect,
                convert: this._convert,
                restore: this._restore
            };
            this._actionMap[type || 'refresh'].call(this, target);
        },

        /**
         * 노드의 상태를 변경한다.
         * @param {Object} node 상태변경될 노드의 정보
         * @private
         */
        _changeNodeState: function(node) {
            var element = document.getElementById(node.id);
            if (!element) {
                return;
            }

            var parent = element.parentNode,
                cls = parent.className;

            if (ne.util.isEmpty(node.childKeys)) {
                cls = 'leap_node ' + this[node.state + 'Set'][0];
            } else {
                cls = 'edge_node ' + this[node.state + 'Set'][0];
            }

            parent.className = cls;
        },

        /**
         * 노드의 이름을 변경 할수 있는 상태로 전환시킨다.
         * @param {HTMLElement} element 이름을 변경할 대상 엘리먼트
         * @private
         */
        _convert: function(element) {
            var id = element.id,
                node = this.model.find(id),
                label = node.value,
                parent = element.parentNode;

            //this.current가 존재하면 style none해제
            if (this.current) {
                this.current.style.display = '';
            }

            element.style.display = 'none';
            this.inputElement.value = label;
            this.current = element;
            parent.insertBefore(this.inputElement, element);

            this.inputElement.focus();
        },

        /**
         * 변경된 노드의 이름을 적용시킨다.
         * @param {HTMLElement} element 이름이 변경되는 대상 엘리먼트
         * @private
         */
        _restore: function(element) {

            var parent = element.parentNode;

            if (this.current) {
                this.current.style.display = '';
            }

            this.inputElement.value = '';

            parent.removeChild(this.inputElement);
        },

        /**
         * 생성된 html을 붙인다
         * @param {String} html 데이터에 의해 생성된 html
         * @param {Object} parent 타겟으로 설정된 부모요소, 없을시 내부에서 최상단 노드로 설정
         * @private
         *
         */
        _draw: function(html, parent) {
            var root = parent || this.root;
            root.innerHTML = html;
        },

        /**
         * 깊이(depth)에 따른 레이블을 설정한다
         * (실제 모델에는 영향을 주지 않으므로, 뷰에서 설정한다.)
         * @param {Array} depthLabels 깊이에 따라 노드 뒤에 붙을 레이블
         */
        setDepthLabels: function(depthLabels) {
            this.depthLabels = depthLabels;
        },

        /**
         * 노드 갱신 - 타겟 노드 기준으로 노드를 다시 만들어서 붙여줌
         * @private
         **/
        _refresh: function() {
            var data = this.model.treeHash.root.childKeys;
            this._draw(this._getHtml(data));
        },

        /**
         * 엘리먼트 타이틀을 변경한다.
         * @param {object} node 변경할 엘리먼트에 해당하는 모델정보
         * @private
         */
        _rename: function(node) {
            var element = document.getElementById(node.id);
            element.innerHTML = node.value;
        },

        /**
        * 노드 여닫기 상태를 갱신한다.
        * @param {Object} node 갱신할 노드 정보
        * @private
        **/
        _toggleNode: function(node) {

            var element = document.getElementById(node.id),
                parent = element.parentNode,
                childWrap = parent.getElementsByTagName('ul')[0],
                button = parent.getElementsByTagName('button')[0],
                state = this[node.state + 'Set'][0],
                label = this[node.state + 'Set'][1],
                isOpen = node.state === 'open';

            parent.className = parent.className.replace(this.openSet[0], '').replace(this.closeSet[0], '') + state;
            childWrap.style.display = isOpen ? '' : 'none';
            button.innerHTML = label;
        },

        /**
         * 노드 선택시 표시변경
         * @param {Object} node 선택된 노드정보
         * @private
         */
        _select: function(node) {
            var valueEl = document.getElementById(node.id);

            if (ne.util.isExisty(valueEl)) {
                valueEl.className = valueEl.className.replace(' ' + this.onselectClass, '') + ' ' + this.onselectClass;
            }
        },

        /**
         * 노드 선택해제시 액션
         * @param {Object} node 선택 해제 된 노드정보
         * @private
         **/
        _unSelect: function(node) {
            var valueEl = document.getElementById(node.id);

            if (ne.util.isExisty(valueEl) && util.hasClass(valueEl, this.onselectClass)) {
                valueEl.className = valueEl.className.replace(' ' + this.onselectClass, '');
            }
        }
    });

})(ne);