'use strict';
var Tree = require('../src/js/tree'),
    util = require('../src/js/util'),
    messages = require('../src/js/consts/messages');

jasmine.getFixtures().fixturesPath = 'base/test/fixtures';
describe('Tree', function() {
    var data = [
            {title: 'A', children: [
                {title: '1'},
                {title: '2'},
                {title: '3'},
                {title: '4'},
                {title: '5', children: [
                    {title:'가', children:[
                        {title:'*'}
                    ]},
                    {title:'나'}
                ]},
                {title: '6'},
                {title: '7'},
                {title: '8'},
                {title: '9', children: [
                    {title:'가'},
                    {title:'나'}
                ]},
                {title: '10'},
                {title: '11'},
                {title: '12'}
            ]},
            {title: 'B', children: [
                {title:'1'},
                {title:'2'},
                {title:'3'}
            ]}
        ],
        tree;

    beforeEach(function() {
        loadFixtures('basicFixture.html');
        tree = new Tree(data, {
            rootElement: 'treeRoot'
        });
    });

    it('should throw an error if has invalid root element', function() {
        function createInvalidTree() {
            return new Tree(data);
        }
        expect(createInvalidTree).toThrowError(messages.INVALID_ROOT_ELEMENT);
    });

    it('should have a root element', function() {
        // Node.ELEMENT_NODE === 1
        // in IE8,
        // element instanceof HTMLElement --> error
        // element.nodeType === Node.ELEMENT_NODE --> error
        expect(tree.rootElement.nodeType).toEqual(1);
    });

    it('should change state of a node to "opened" when open node', function() {
        var firstChild = tree.model.getChildren(tree.model.rootNode.getId())[0];

        tree.open(firstChild.getId());
        expect(firstChild.getState()).toEqual('opened');
    });

    it('should change state of a node to "closed" when close node', function() {
        var firstChild = tree.model.getChildren(tree.model.rootNode.getId())[0];

        tree.close(firstChild.getId());
        expect(firstChild.getState()).toEqual('closed');
    });

    it('should toggle state of a node when toggle node', function() {
        var firstChild = tree.model.getChildren(tree.model.rootNode.getId())[0];

        tree.open(firstChild.getId());
        tree.toggle(firstChild.getId());
        expect(firstChild.getState()).toEqual('closed');

        tree.toggle(firstChild.getId());
        expect(firstChild.getState()).toEqual('opened');
    });

    it('should fire singleClick event', function() {
        var handler = jasmine.createSpy('singleClick handler'),
            eventMock = {
                target: document.createElement('DIV')
            };

        jasmine.clock().install();

        tree.on('singleClick', handler);
        tree.clickTimer = null; // No clicked
        tree._onClick(eventMock); // Single click

        jasmine.clock().tick(401);

        expect(handler).toHaveBeenCalled();
        jasmine.clock().uninstall();
    });

    it('should change button label when change the state of node', function() {
        var firstChildId = tree.model.rootNode.getChildIds()[0],
            firstChildElement = document.getElementById(firstChildId),
            btnElement = util.getElementsByClassName(firstChildElement, tree.classNames.toggleBtnClass)[0];

        tree.close(firstChildId);
        expect(btnElement.innerHTML).toEqual(tree.stateLabels.closed);

        tree.open(firstChildId);
        expect(btnElement.innerHTML).toEqual(tree.stateLabels.opened);
    });

    it('should fire doubleClick event', function() {
        var handler = jasmine.createSpy('doubleClick handler'),
            eventMock = {
                target: document.createElement('DIV')
            };

        tree.on('doubleClick', handler);
        tree.clickTimer = 1; // Set clicked once
        tree._onClick(eventMock); // Double click

        expect(handler).toHaveBeenCalled();
    });

    it('should redraw nodes when new nodes are added', function() {
        var firstChildId = tree.model.rootNode.getChildIds()[0],
            firstChild = tree.model.getNode(firstChildId),
            childCount = firstChild.getChildIds().length,
            subtreeElement = document.getElementById(firstChildId).lastChild,
            data = [
                {text: 'hello world'},
                {text: 'new world'}
            ];

        spyOn(tree, '_drawChildren').and.callThrough();

        tree.add(data, firstChildId);
        expect(firstChild.getChildIds().length).toEqual(childCount + 2);
        expect(subtreeElement.childNodes.length).toEqual(childCount + 2);
    });

    it('should return node ids when new nodes are added', function() {
        var firstChildId = tree.model.rootNode.getChildIds()[0],
            data = [
                {text: 'hello world', children: [
                    {text: 'foo'},
                    {text: 'bar'}
                ]},
                {text: 'new world'}
            ],
            ids = tree.add(data, firstChildId);

        expect(ids).toEqual(jasmine.any(Array));
        expect(ids.length).toEqual(2);
    });

    it('should redraw nodes when a node is removed', function() {
        var firstChildId = tree.model.rootNode.getChildIds()[0],
            firstChild = tree.model.getNode(firstChildId),
            childCount = firstChild.getChildIds().length,
            subtreeElement = document.getElementById(firstChildId).lastChild,
            idForRemoving = firstChild.getChildIds()[0];

        tree.remove(idForRemoving);
        expect(document.getElementById(idForRemoving)).toBeFalsy();
        expect(firstChild.getChildIds().length).toEqual(childCount - 1);
        expect(subtreeElement.childNodes.length).toEqual(childCount - 1);
    });

    it('should redraw nodes when a node is moved', function() {
        var firstChildId = tree.model.rootNode.getChildIds()[0],
            lastChildId = tree.model.rootNode.getChildIds().slice(-1)[0], // slice(-1) returns a value of last index
            grandChildId = tree.model.getNode(firstChildId).getChildIds()[0],
            firstChildElement, lastChildElement, grandChildElement;

        tree.move(grandChildId, lastChildId);
        firstChildElement = document.getElementById(firstChildId);
        lastChildElement = document.getElementById(lastChildId);
        grandChildElement = document.getElementById(grandChildId);

        expect(firstChildElement.contains(grandChildElement)).toBe(false);
        expect(lastChildElement.contains(grandChildElement)).toBe(true);
    });

    it('should fire "move" event when a node is moved', function() {
        var firstChildId = tree.model.rootNode.getChildIds()[0],
            lastChildId = tree.model.rootNode.getChildIds().slice(-1)[0], // slice(-1) returns a value of last index
            grandChildId = tree.model.getNode(firstChildId).getChildIds()[0];

        spyOn(tree, 'fire');

        tree.move(grandChildId, lastChildId);

        expect(tree.fire).toHaveBeenCalledWith('move', {
            nodeId: grandChildId,
            originalParentId: firstChildId,
            newParentId: lastChildId
        });
    });
});
