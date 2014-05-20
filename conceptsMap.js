/*
 * Authors:
 * Per Jonsson, Anton Lindgren, Johan Karlsson, Hannah BÃ¶rjesson, Linda Jansson
 *
 * As part of TDP023, Agile System Development, LinkÃ¶ping University 2014
 *
 * The backbone of the concepts map module.
 * Provides functionality for toggling inactive states, undo history, locking, overlay, loading data, etcetera
 *
 * */


// A concept is fetched from the database and placed inside a container on the left side of the screen
conceptContainer = $("#concepts");
startConcept = $("#person");
startConceptMarginTop = 125;
numbOfConcepts = 10;
startConceptBackground = "#CCFFFF";   // empty string if same as all other concepts

// Magnetism can join a concept with a relation with the help of arrows / dots
magneticFactor = 0.1; // size of magnetic field surrounding objects
magneticStatic = 5;   // static magnetic size in addition to percentage

// A relation is fetched from the database and placed inside a container on the right side of the screen
relationContainer = $("#relations");
relationLineLength = 10;
relationLineStyle = {endPointRadius: 5, color: "black", arrowSize: 15, lineWidth: 2};

// Blackboard items
blackBoard = $("#board");
questionHeadline = $("#questionHeadline");
// Buttons
theReadyButton = $("#readybutton");
undoButton = $(".undo2");
buttonTopMargin = 415;

undoList = [];
playerFacts = [];
var agentKnowledge = new AgentKnowledge(playerFacts);

$(document).ready(function() {
    start();
    loadAgentBeliefs();
});



function start(){
    theReadyButton.css("color","black");

    // Initialize counters
    completeRelations = 0;
    requiredRelations = 0;

    // Concepts are valid if completed relations are greater than required relations
    validateConcepts();

    // Create overlays
    var concepts_overlay = jQuery('<div>', {
        id: 'concepts_overlay',
        class: "overlay active"
    }, '</div>');
    var relations_overlay = jQuery('<div>', {
        id: 'relations_overlay',
        class: "overlay active"
    }, '</div>');

    // Add to DOM
    //
    concepts_overlay.appendTo($("body"));

    relations_overlay.appendTo($("body"));

    initOverlay(concepts_overlay,conceptContainer, true);
    initOverlay(relations_overlay,relationContainer, true);

    // To be contained
    conceptContainer[0].idCount = 0;
    concepts = [];

    relationContainer[0].idCount = 0;
    relations = [];
    var counter = 0;



    // Call views.py, get database data ()
    var getConceptsMapReq =
        $.get('{% url 'hWorld.views.getConceptsMap' %}').done(function(jsonData) {
        requiredRelations = jsonData.facts.length-1;

        // Fill containers with data from get request
        $.each(jsonData.question, function(index,value) {
            questionHeadline.html(value.question);


            logger.log("User","Question", value.question, 0);


        });

        $.each(jsonData.startConcept, function(index,value) {

            startConcept.html(value.startConcept);

            logger.log("User","StartConcept", value.startConcept, 0);

        });

        facts = jsonData.facts;
        number_of_facts = facts.length;

        var logString = "";

        $.each(jsonData.concepts, function(index,value) {
            if(counter < numbOfConcepts){
                concepts.push(createConcept(value.concept));
                counter++;

                logString += value.concept + ",";
            }
        });

        logger.log("User","ConceptsAppeared", logString, 0);

        logString = "";

        $.each(jsonData.relations, function(index,value) {
            relations.push(createRelation(value.relation));
            logString += value.relation + ",";
        });
        logger.log("User","RelationsAppeared", logString, 0);


        // Create and position r:s and c:s
        var relYPos = 45;
        $.each(relations, function (index, relation) {
            // initRelation(relation);
            initPos(relation, relationLineLength+18, relYPos);
            relYPos += relation.height()+7;
            relation[0].startX = relation.offset().left;
            relation[0].startY = relation.offset().top;
            keepRelationAttachment(relation);
        });

        var concYPos = 35;
        $.each(concepts, function (index, concept) {
            initConcept(concept);
            initPos(concept, -7, concYPos);
            concYPos += concept.children().height()+7;
            concept[0].startX = concept.offset().left;
            concept[0].startY = concept.offset().top;
        });


        initBoard(blackBoard);
        validateConcepts();

        // TODO: Logic here 
        theReadyButton.click(function(){
            presentResults();
        });
        undoButton.click(function(){
            undoLatest();
        });

        // e.g. Leonardo da Vinci
        var initialPerson = $("#personContainer").children().html();
        startConcept = createConcept(initialPerson, true);
        startConcept.offset({left: blackBoard.offset().left+blackBoard.width()/2-startConcept.width()/2 - 125, top:startConceptMarginTop});
        startConcept.addClass("unremoveable copy");
        startConcept[0].startX = startConcept.offset().left;
        startConcept[0].startY = startConcept.offset().top;

        $("#personContainer").remove();
        startConcept.children().addClass("initConceptWider");

        if(startConceptBackground) startConcept.children().css("background",startConceptBackground);
        initConcept(startConcept);

        // Positioning
        var boardTop = blackBoard.offset().top;
        var boardLeft = blackBoard.offset().left;
        undoButton.offset({top: boardTop+buttonTopMargin, left: boardLeft+150});
        theReadyButton.offset({top: boardTop+buttonTopMargin, left: boardLeft+280});

        // Overlay = inactive
        toggleOverlay($("#relations_overlay"));

        disableUndoButton();
    });
}

// Sets "overlay" to same size and position as "box"
function initOverlay(overlay, box, first)
{
    overlay.css("position", "aboslute");
    overlay.width(box.width()+3);
    overlay.height(box.height()+6);
    padding_left = parseInt(box.parent().parent().css("padding-left"),10);
    padding_top = parseInt(box.parent().parent().css("padding-top"),10);
    toppy = box.offset().top + padding_top-10;
    left = box.offset().left + padding_left-11;
    overlay.offset({top: toppy,left: left});

    if(first){
        overlay.css("z-index","150");
        overlay.css("background","#F0F0F0");
        overlay.css("opacity","0.66");
    }
}
// Toggle overlay on/ off
function toggleOverlay(overlay)
{
    if(overlay.hasClass("active"))
    {
        overlay.removeClass("active");
        overlay.css("opacity",0.66);
        overlay.animate(
            {
                duration: 400,
                opacity: 0
            },function(){ overlay.css("z-index",-250) }
        );
    }
    else
    {
        overlay.addClass("active");
        overlay.css("z-index",250);
        overlay.css("opacity",0);
        overlay.animate(
            {
                duration: 400,
                opacity: 0.66
            }
        );
    }
}
// Toggle both overlays
function switchOverlay()
{
    toggleOverlay($("#concepts_overlay"));
    toggleOverlay($("#relations_overlay"));
}


function createFact(relation)
{
    var end = relation[0].endpoints[0][0].attachedTo[0].name;
    var start = relation[0].endpoints[1][0].attachedTo[0].name;
    var relation = relation[0].name;
    return {end: end, start: start, relation: relation};
}

function correctFact(playerFact)
{
    var returnValue = false
    var i = 0;
    $.each(facts, function(index, fact){
        if(fact.start == playerFact.start &&
            fact.relation == playerFact.relation &&
            fact.end == playerFact.end)
        {
            returnValue = true;
            i = index;
            return;
        }
    });
    if(returnValue)  facts.splice(i,1);
    return returnValue;
}
// Initializes the blackboard
function initBoard(obj) {

    obj.droppable({
        drop: function (event, ui) {
            $(ui.draggable).removeClass("remove");
            if($(ui.draggable).hasClass("unremoveable")) return;
            $(ui.draggable).addClass("unremoveable");
            // Each object can only be dropped once
            if(!$(ui.draggable).hasClass("dropped")){
                // If a relation is dropped: enable endpoints and switch overlays.
                if($(ui.draggable).hasClass("relation"))
                {
                    /*Log */
                    var logValue = $(ui.draggable)[0].name;
                    logger.log("User","AddedRelation", logValue, 0);


                    enableUndoButton();
                    switchOverlay();
                    if(undoList.length > 0){
                        previousRelation = undoList[0][1];
                        previousRelation[0].endpoints[0].css("z-index","0");
                        previousRelation[0].endpoints[1].css("z-index","0");
                        clearUndoList();
                        var playerfact = playerFacts[playerFacts.length-1];
                        var fact = playerfact.fact;
                        var correct = playerfact.correct;
                        var playerType = "player";
                        logValue = playerType + ";" + fact.start + ";" + fact.relation + ";" + fact.end;
                        logger.log("User","AddedConceptMapFact", logValue, 0);

                        agentKnowledge.update(fact,correct,1);

                    }
                    undoList.push(["relation", $(ui.draggable)]);

                }
                // If a concept is dropped: both overlays should be disabled
                else if($(ui.draggable).hasClass("concept"))
                {
                    var relation = undoList[undoList.length - 1][1];
                    toggleOverlay($("#concepts_overlay"));
                    undoList.push(["concept", $(ui.draggable)]);


                    var logValue = $(ui.draggable)[0].name;
                    logger.log("User","AddedConcept", logValue, 0);


                    toggleDrag(relation[0].endpoints[0]);
                    toggleDrag(relation[0].endpoints[1]);
                }
                $(ui.draggable).addClass("dropped");
            }

            // Make dropped object active
            var objectToGiveFrame;
            if($(ui.draggable).hasClass("relation")){
                objectToGiveFrame = $(ui.draggable);
            }
            else{
                objectToGiveFrame = $(ui.draggable).children();
            }

            giveBorder(objectToGiveFrame);
            $(ui.draggable).removeClass("remove");
        },
        out: function (event, ui) {
            // Object should be removed if dropped outside of blackboard
            $(ui.draggable).addClass("remove");
        }
    });
}

function giveBorder(obj){
    obj.css({"border-color": "blue",
        "border-width":"5px",
        "border-style":"solid"});
}

// Enable/disable dragging of object
function toggleDrag(obj){
    if(obj.hasClass("ui-draggable-disabled"))
    {
        obj.draggable("enable");
        obj.css("cursor","pointer");
        obj.removeClass("ui-draggable-disabled");
    }
    else
    {
        obj.draggable("disable");
        obj.css("cursor","default");
        obj.removeClass("ui-draggable");
    }
}

// Initialize endpoints
function initEndpoint(endpoint) {
    endpoint[0].attachedTo = "";
    endpoint.draggable({
        start: function (event, ui) {
            // Disattach endpoint from relation
            removeFromArray(endpoint, endpoint[0].relation[0].attached);
            if(!endpoint[0].attachedTo){
                endpoint.addClass("counted");
            }
        },
        stop: function (event, ui) {
            if (endpoint[0].attachedTo == "") {
                // Attach endpoint to relation if not dropped on a concept
                endpoint[0].relation[0].attached.push(endpoint);
                keepRelationAttachment(endpoint[0].relation);
            }
        }
    });
}

function textLength(text)
{
    var thinLetters = ['f','i','j','l','r','t','I'];

    var length = 0;
    for(i = 0; i < text.length; ++i)
    {
        if($.inArray(text[i],thinLetters) != -1){
            length += 1;
        }
        else{
            length += 2;
        }
    }
    return length;
}

function addNewLine(text, index, splitChar)
{
    var newText = text.substr(0,index);
    newText += splitChar + "<br>";
    newText += text.substr(index,text.length - index+1);

    return newText;
}

function splitName(name)
{
    var newName;
    var delim = "";
    var fix = 0;

    if($.inArray("-", name) != -1)
    {
        delim = "-"
        fix = 1;
    }
    else if($.inArray(" ", name) != -1)
    {
        delim = " ";
    }
    if(delim)
    {
        var middle = Math.floor(name.length/2);
        for(i = 0; i < name.length /2; ++i)
        {
            if(name[middle-i] == delim)
            {
                newName = addNewLine(name,middle-i+fix, "");
                break;
            }
            else if(name[middle+i] == delim)
            {
                newName = addNewLine(name,middle+i+fix, "");
                break;
            }
        }
    }
    else{
        newName = addNewLine(name, Math.floor(name.length/2), "-");
    }
    return newName;
}


// Create a new relation and add it to DOM
function createRelation(name) {
    var newRelation = jQuery('<div>', {
        id: 'relation' + relationContainer[0].idCount,
        class: "relation"
    }, '</div>');
    relationContainer[0].idCount += 1;
    newRelation.appendTo(relationContainer);

    // Center text inside relation
    newRelation.children().css("margin-top", newRelation.height() / 2 - newRelation.children().height()/2);
    initRelation(newRelation);
    newRelation[0].name = name;

    var length = textLength(name);
    var newName = name;
    if(length > 18)
    {
        newRelation.height(newRelation.height()*1.6);
        newName = splitName(name);
    }

    newRelation.html("<p>" + newName + "</p>");
    return newRelation;
}

//            --  ----------------
//            |   |              |
//            |   |  ----------  |  --
//  Droppable-|   |  |Da Vinci|  |   |-InnerConcept
//            |   |  ----------  |  --
//            |   |              |
//            --  ----------------
//

function createInnerConcept(obj) {
    var magnet = jQuery('<div>', {
        id: obj.attr('id') + "-magnet",
        class: "magnet"
    }, '</div>');
    magnet.appendTo(obj);
}

function createConcept(name, startConcept) {
    var concept = jQuery('<div>', {
        id: 'concept' + conceptContainer[0].idCount,
        class: "concept"
    }, '</div>');

    concept.appendTo(conceptContainer);
    conceptContainer[0].idCount += 1;
    createInnerConcept(concept);


    // Center concept-text
    //  concept.children().children().css("margin-top",concept.children().height()/2 - concept.children().children().height()/2);
    concept[0].name = name;

    var length = textLength(name);
    var limit = 20;
    if( startConcept){
        limit = 35;
    }

    var newName = name;

    if(length > limit)
    {
        concept.children().height(concept.children().height()*1.6);
        newName = splitName(name);
    }
    concept.children().html("<p>" + newName + "</p>");
    return concept;
}

// Set relative position from "obj"
function initPos(obj, left, top) {
    obj.css("left", left);
    obj.css("top", top);
}

// Move attached endpoints to correct position and repaint lines
function keepRelationAttachment(relation) {

    // Move and repaint recently attached (to concept) endpoint
    $.each(relation[0].endpoints, function (index, value) {
        if (value[0].attachedTo) {
            keepAttached(value, value[0].attachedTo);
            jsPlumb.repaint(value);
        }
    });

    $.each(relation[0].attached, function (index, endpoint) {
        var border = parseInt(relation[0].style.borderWidth);
        if(!border) border = 0;
        if (endpoint.hasClass("arrow")) {
            endpoint.offset({top: relation.offset().top + relation.height() / 2 - endpoint.height() / 2 + border, left: relation.offset().left + relation.width() + relationLineLength + border});
        } else if (endpoint.hasClass("dot")) {
            endpoint.offset({top: relation.offset().top + relation.height() / 2 - endpoint.height() / 2 + border, left: relation.offset().left - relationLineLength - endpoint.width() + border + 7});
        }
        jsPlumb.repaint(endpoint);
    });
    jsPlumb.repaint(relation);
}


// Initialize the relation and create endpoints
function initRelation(relation) {
    // Create endpoints
    var dot = jQuery('<div>', {
        id: relation.attr('id') + "-dot",
        class: "dot endpoint"
    }, '</div>');
    var arrow = jQuery('<div>', {
        id: relation.attr('id') + "-arrow",
        class: "arrow endpoint"
    }, '</div>');
    arrow.appendTo(relationContainer);
    dot.appendTo(relationContainer);

    arrow[0].relation = relation;
    dot[0].relation = relation;
    relation[0].attached = [arrow, dot];
    relation[0].endpoints = [arrow, dot];

    relation.draggable({
        start: function (event, ui) {

            var logValue = relation[0].name;
            logger.log("User","DragRelation", logValue, 0);


            if(relation.hasClass("unremoveable")){
                relation[0].left = relation.offset().left;
                relation[0].top = relation.offset().top;
            }

            // Make a copy of the relation if not already copied
            if (!relation.hasClass("copy")) {
                var copy = createRelation(relation[0].name);
                copy.offset({top: relation.offset().top, left: relation.offset().left});
                copy[0].startX = copy.offset().left;
                copy[0].startY = copy.offset().top;
                relation.addClass("copy");
                keepRelationAttachment(copy);
                relation[0].copy = copy;
            }

            // Remove if not dropped on blackboard
            relation.addClass("remove");
        },
        drag: function (event, ui) {

            // Move endpoints and repaint while dragging
            keepRelationAttachment(relation);
        },
        stop: function (event, ui) {
            keepRelationAttachment(relation);

            // Remove relation (including endpoints and lines) and update number of connected relations
            /*
             if(relation.hasClass("unremoveable") && relation.hasClass("remove")){
             relation.offset({top: relation[0].top, left: relation[0].left});
             keepRelationAttachment(relation);
             }*/

            if(relation.hasClass("unremoveable")){
                var x = relation.offset().left;
                var x0 = x;
                var y = relation.offset().top;
                var y0 = y;
                var margin = 15;


                if(relation.offset().left - relationLineLength < blackBoard.offset().left){
                    x = blackBoard.offset().left + relationLineLength + margin;
                }
                if(relation.offset().top < blackBoard.offset().top + questionHeadline.height()){
                    y = blackBoard.offset().top + questionHeadline.height() + margin;
                }
                if(relation.offset().left + relation.width() + relationLineLength > blackBoard.offset().left + blackBoard.width()){
                    x = blackBoard.offset().left + blackBoard.width() - relation.width() - relationLineLength - margin - 10;
                }
                if(relation.offset().top + relation.height() > blackBoard.offset().top + blackBoard.height()){
                    y = blackBoard.offset().top + blackBoard.height() - relation.height() - margin;
                }

                if(!(x0 == x && y0 == y))
                    moveBack(relation,function(){},keepRelationAttachment, x, y);

            }
            else if (relation.hasClass("remove")) {
                moveBack(relation,removeRelation,keepRelationAttachment);
            }
        }
    });

    // Create lines between endpoints and relation
    var anchors = ["Center", "Center"];
    var line = jsPlumb.connect({
        source: relation,
        target: arrow,
        endpoints: ["Dot", "Blank"],
        endpointStyle: {
            radius: relationLineStyle.endPointRadius,
            fillStyle: relationLineStyle.color
        },
        anchors: anchors,
        connector: "Straight",
        overlays: [
            ["PlainArrow", {
                location: 1,
                width: relationLineStyle.arrowSize,
                length: relationLineStyle.arrowSize
            }]
        ]
    });
    line.setPaintStyle({
        fillStyle: relationLineStyle.color,
        strokeStyle: relationLineStyle.color,
        lineWidth: relationLineStyle.lineWidth
    });
    var line2 = jsPlumb.connect({
        source: relation,
        target: dot,
        endpoints: ["Dot", "Dot"],
        endpointStyle: {
            radius: relationLineStyle.endPointRadius,
            fillStyle: relationLineStyle.color
        },
        anchors: anchors,
        connector: "Straight"
    });
    line2.setPaintStyle({
        fillStyle: relationLineStyle.color,
        strokeStyle: relationLineStyle.color,
        lineWidth: relationLineStyle.lineWidth
    });

    // Initialize endpoints
    initEndpoint(arrow);
    initEndpoint(dot);

    // Disable dragging
    toggleDrag(arrow);
    toggleDrag(dot);

    relation[0].line = line;
    relation[0].line2 = line2;
}

function initConcept(concept) {

    // Create magnetic area (droppable)
    var magneticArea = concept.children().width() * magneticFactor + magneticStatic;
    concept.css("width", concept.children().width() + magneticArea * 2);
    concept.css("height", concept.children().height() + magneticArea * 2);
    concept.children().css("margin", magneticArea-2);

    concept[0].attached = []; // attached endpoints
    concept.draggable({
        start: function (event, ui) {


            var logValue = concept[0].name;
            logger.log("User","DragConcept", logValue, 0);


            // Save start position if unremovable
            if(concept.hasClass("unremoveable")){
                concept[0].left = concept.offset().left;
                concept[0].top = concept.offset().top;
            }

            // Copy from concept list
            if (!concept.hasClass("copy")) {
                var copy = createConcept(concept[0].name);
                copy.offset({left: concept.offset().left, top: concept.offset().top});
                copy[0].startX = copy.offset().left;
                copy[0].startY = copy.offset().top;
                concept.addClass("copy");
                initConcept(copy);
                concept[0].copy = copy
            }


            // Mark for deletion
            concept.addClass("remove");
        },
        drag: function (event, ui) {
            keepAllAttached(concept);
        },
        stop: function (event, ui) {
            keepAllAttached(concept);

            // move back to board if unremovable dropped outside board
            if(concept.hasClass("unremoveable")){
                var innerConcept = concept.children();
                var x = innerConcept.offset().left;
                var x0 = x;
                var y = innerConcept.offset().top;
                var y0 = y;
                var moved = 0;

                var margin = parseInt(innerConcept.css("margin-left")) + 15;

                if(innerConcept.offset().left < blackBoard.offset().left){
                    x = blackBoard.offset().left;
                    y -= margin/2;
                    moved = 1;
                }
                if(innerConcept.offset().top < blackBoard.offset().top + questionHeadline.height()){
                    y = blackBoard.offset().top + questionHeadline.height();
                    if(!moved) x -= margin/2;
                    moved = 1;
                }
                if(innerConcept.offset().left + innerConcept.width() > blackBoard.offset().left + blackBoard.width()){
                    x = blackBoard.offset().left + blackBoard.width() - innerConcept.width() - margin;
                    if(!moved) y -= margin/2;
                    moved = 1;
                }
                if(innerConcept.offset().top + innerConcept.height() > blackBoard.offset().top + blackBoard.height()){
                    y = blackBoard.offset().top + blackBoard.height() - innerConcept.height() - margin;
                    if(!moved) x -= margin/2;
                }
                if(!(x0 == x && y0 == y))
                    moveBack(concept,function(){},keepAllAttached, x, y);
            }

            // remove if dropped outside board

            else if (concept.hasClass("remove")) {
                moveBack(concept,removeConcept);
            }
        }
    });
    concept.droppable({
        scope: jsPlumb.getDefaultScope(),
        drop: function (event, ui) {

            // only do stuff if endpointc
            if (!$(ui.draggable).hasClass("endpoint")) {
                return;
            }
            var attaching = true;

            // determine what object is already connected to by the relation
            var otherEnd = "";
            if($(ui.draggable).hasClass("arrow")){
                otherEnd = $(ui.draggable)[0].relation[0].endpoints[1][0].attachedTo;
            }
            else{
                otherEnd = $(ui.draggable)[0].relation[0].endpoints[0][0].attachedTo;
            }

            // don't attach to the same concept with both ends
            if(otherEnd && otherEnd[0].name == concept[0].name) {
                attaching = false;
                keepRelationAttachment($(ui.draggable)[0].relation);
            }
            var logType = "TriedAttaching";
            if (attaching) {

                // Count each fact once
                $(ui.draggable)[0].relation[0].endpoints[0].removeClass("counted");
                $(ui.draggable)[0].relation[0].endpoints[1].removeClass("counted");
                if ($(ui.draggable)[0].attachedTo == "" || $(ui.draggable)[0].attachedTo == concept[0]) {

                    // Attach dropped endpoint to this concept
                    attach($(ui.draggable), concept);

                    // If both endpoints are attached, add 1 to completeRelations
                    if($(ui.draggable)[0].relation[0].attached.length == 0){
                        completeRelations += 1;
                        validateConcepts();

                        var relation = $(ui.draggable)[0].relation;
                        $.each(relation[0].endpoints, function(index, endpoint){
                            toggleDrag(endpoint);
                        });
                        toggleOverlay($("#relations_overlay"));

                        undoList.push(["locked",relation]);

                        var fact = createFact(relation);
                        var correct = correctFact(fact);
                        playerFacts.push({fact: fact, correct: correct});

                    }
                }
                logType = "SuccessfulAttachment";
            }
            var logValue = concept[0].name + "; " +  $(ui.draggable)[0].relation[0].name;
            logger.log("User",logType, logValue, 0);


            // Move and repaint
            keepRelationAttachment($(ui.draggable)[0].relation);
        },
        out: function (event, ui) {
            var logValue = $(ui.draggable)[0].relation[0].name + ";" + concept[0].name;
            logger.log("User","DisattachedRelation", logValue, 0);

            // Remove endpoint from attached array
            removeFromArray($(ui.draggable), $(this)[0].attached);
            $(ui.draggable)[0].attachedTo = "";

            // Remove 1 from completeRelations if endpoints is disattached from a completeRelation
            if(!$(ui.draggable).hasClass("counted") && $(ui.draggable)[0].relation[0].attached.length == 0){
                completeRelations -= 1;
                validateConcepts();
            }

            // Count each fact once
            $(ui.draggable)[0].relation[0].endpoints[0].addClass("counted");
            $(ui.draggable)[0].relation[0].endpoints[1].addClass("counted");
        }
    });
}

function keepAllAttached(concept) {
    $.each(concept[0].attached, function (index, endpoint) {

        keepAttached(endpoint, concept);
        jsPlumb.repaint(endpoint);
        jsPlumb.repaint(endpoint[0].relation);

    });
}

function removeFromArray(obj, arr) {
    $.each(arr, function (index, value) {
        if (value[0] == obj[0]) {
            arr.splice(index, 1);
            value[0].attached = false;
            return false;
        }
    });
}


// Move endpoint to concept side calculated from relation position
function keepAttached(endpoint, concept) {
    var x0 = concept.children().offset().left + concept.children().width() / 2;
    var y0 = concept.children().offset().top + concept.children().height() / 2;
    endpoint[0].side = getSide(x0, y0, endpoint);
    var coord = getCoords(x0, y0, endpoint[0].side, endpoint, concept);
    endpoint.offset({top:coord[1],left:coord[0]});
}


function attach(endpoint, concept) {
    var relation = endpoint[0].relation;
    var logValue = "";
    if(endpoint.hasClass("arrow")){

        // Logging
        logValue = relation[0].name +";"+ concept[0].name;
    }
    else{
        logValue = concept[0].name + ";" + relation[0].name;
    }
    logger.log("User","AttachedRelation", logValue, 0);

    // Don't attach if already attached
    var add = false;
    $.each(concept[0].attached, function (index, value) {
        if (value[0] == endpoint[0]) {
            add = true;
        }
    });

    if (!add) {
        concept[0].attached.push(endpoint);
        endpoint[0].attachedTo = concept;
    }
    keepAttached(endpoint,concept);
}

// Calculate which side endpoint should be attached to (relative to relation)
function getSide(x0, y0, endpoint) {
    var relation = endpoint[0].relation;
    var x = relation.offset().left + relation.width() / 2 - x0; //relative coordinates from square-center
    var y = relation.offset().top + relation.height() / 2 - y0;
    if (x < 0 && y < 0) //top-left corner
    {
        if (Math.abs(y) > Math.abs(x)) return "top";
        else return "left";

    } else if (x < 0 && y > 0) //bottom-left corner
    {
        if (Math.abs(y) > Math.abs(x)) return "bottom";
        else return "left";
    } else if (x > 0 && y < 0) //top-right corer
    {
        if (Math.abs(y) > Math.abs(x)) return "top";
        else return "right";

    } else // bottom-right corner
    {
        if (Math.abs(y) > Math.abs(x)) return "bottom";
        else return "right";
    }
}

// Calculate coordinates for endpoint - x0,y0 = concept-center
function getCoords(x0, y0, side, endpoint, concept) {
    var endpointHeight = endpoint.height() / 2;
    var endpointWidth = endpoint.width() / 2;
    var x = 0;
    var y = 0;
    if (side == "top") {
        x = x0 - endpointWidth;
        y = y0 - concept.children().height() / 2 - endpointHeight;
    }
    if (side == "right") {
        x = x0 + concept.children().width() / 2 - endpointWidth;
        y = y0 - endpointHeight;
    }
    if (side == "bottom") {
        x = x0 - endpointWidth;
        y = y0 + concept.children().height() / 2 - endpointHeight;
    }
    if (side == "left") {
        x = x0 - concept.children().width() / 2 - endpointWidth;
        y = y0 - endpointHeight;
    }
    return [x, y];
}

// Activate the ready button if enough complete relations
function validateConcepts(){

    if(completeRelations >= requiredRelations){
        theReadyButton[0].disabled = false;
        theReadyButton.css("background-color","#379237");
        theReadyButton.css("color","black");
    }
    else{
        theReadyButton[0].disabled = true;
        theReadyButton.css("background-color","#A2A2A2");
        theReadyButton.css("color","#636363");
    }
}

function clearUndoList(){
    if(undoList.length > 0)
    {
        undoList[0][1].css("border","1px solid black");
        undoList[1][1].children().css("border","1px solid black");
        undoList = [];
    }
}

function enableUndoButton(){
    undoButton[0].disabled = false;
    undoButton.css("background-color","#FFD300");
    undoButton.css("color","black");
    undoButton.css("cursor","pointer");
}

function disableUndoButton(){
    undoButton[0].disabled = true;
    undoButton.css("background-color","#A2A2A2");
    undoButton.css("color","#636363");
    undoButton.css("cursor","default");
}

function undoLatest(){
    var latest;
    if(undoList.length > 0) latest = undoList.pop();
    else latest = ["startConcept", startConcept];
    if(latest[0] == "locked"){
        var relation = latest[1];
        $.each(relation[0].endpoints, function(index, endpoint){
            if(! endpoint[0].attachedTo.children().hasClass("initConceptWider")){
            }
            removeFromArray(endpoint, endpoint[0].attachedTo[0].attached)
            endpoint[0].attachedTo = "";
            relation[0].attached.push(endpoint);
            toggleDrag(endpoint);
        });
        toggleOverlay($("#relations_overlay"));

        completeRelations -= 1;
        validateConcepts();

        var latestConcept = undoList[undoList.length-1][1].children();
        var latestRelation = undoList[undoList.length-2][1];

        giveBorder(latestConcept);
        giveBorder(latestRelation);
        keepRelationAttachment(relation);

        playerFacts.pop();
    }

    else if(latest[0] == "concept"){
        var concept = latest[1];
        var relation = undoList[undoList.length - 1][1];
        $.each(relation[0].endpoints, function(index, endpoint){
            toggleDrag(endpoint);
        });

        concept.children().css("border","1px solid black");
        moveBack(concept, removeConcept);
        toggleOverlay($("#concepts_overlay"));

    }

    else if(latest[0] == "relation"){
        var relation = latest[1];
        //removeLineFromRelation(relation)
        relation.css("border","1px solid black");
        moveBack(relation, removeRelation, keepRelationAttachment);
        switchOverlay();
    }


    if(undoList.length == 0)
    {
        disableUndoButton();
    }

    var logValue  = latest[0] + ";" + latest[1][0].name;
    logger.log("User","Undo", logValue, 0);

}


function removeConcept(concept) {
    $.each(concept[0].attached,function(index,value){
        value[0].attachedTo = "";
        value[0].relation[0].attached.push(value);
        keepRelationAttachment(value[0].relation);
    });
    concept[0].parentNode.removeChild(concept[0]);
}

function removeRelation(relation) {
    if(!relation.hasClass("lineLess")) removeLineFromRelation(relation);
    relation[0].parentNode.removeChild(relation[0]);
}

function removeLineFromRelation(relation){
    relation.addClass("lineLess");
    var arrow = relation[0].endpoints[0];
    var dot = relation[0].endpoints[1];
    var line = relation[0].line;
    var line2 = relation[0].line2;
    if(dot[0].attachedTo){removeFromArray(dot,dot[0].attachedTo[0].attached);}
    if(arrow[0].attachedTo){removeFromArray(arrow,arrow[0].attachedTo[0].attached);}
    dot[0].parentNode.removeChild(dot[0]);
    arrow[0].parentNode.removeChild(arrow[0]);
    line.endpoints[0].canvas.parentNode.removeChild(line.endpoints[0].canvas);
    line.endpoints[1].canvas.parentNode.removeChild(line.endpoints[1].canvas);
    line2.endpoints[0].canvas.parentNode.removeChild(line2.endpoints[0].canvas);
    line2.endpoints[1].canvas.parentNode.removeChild(line2.endpoints[1].canvas);
    jsPlumb.detach(line);
    jsPlumb.detach(line2);
}

// moves object(concept/relation) back to its starting position
function moveBack(object, removeFunction, progressFunction, startX, startY){
    if(!progressFunction){ progressFunction = function(){};}
    if(!startX){ startX = object[0].copy.offset().left;}
    if(!startY){ startY = object[0].copy.offset().top;}
    var currentX = object.offset().left;
    var currentY = object.offset().top;
    var xDiff = currentX - startX;
    var yDiff = currentY - startY;
    object.animate({left: "-=" + xDiff, top: "-=" + yDiff},
        {
            duration: 1000,
            complete: function () {removeFunction(object);},
            progress: function () {progressFunction(object);}
        }
    );
}

// oh the phun
function pulse(object){
    object.animate({
        top: "-=2",
        left: "-=2",
        width: "+=4",
        height: "+=4"
    },200).animate({
            top: "+=2",
            left: "+=2",
            width: "-=4",
            height: "-=4"
        }, 200,function(){pulse(object)});

}


function presentResults()
{
    var result = 0;
    $.each(playerFacts, function(index, fact){
        if(fact.correct){
            result++;
        }
    });

    if(playerFacts.length > number_of_facts)
    {
        result -= playerFacts.length - number_of_facts;
    }

    if(undoList.length == 3)
    {
        var playerfact = playerFacts[playerFacts.length-1];
        var fact = playerfact.fact;
        var correct = playerfact.correct;
        var playerType = "player";
        logValue = playerType + ";" + fact.start + ";" + fact.relation + ";" + fact.end;
        logger.log("User","AddedConceptMapFact", logValue, 0);

        agentKnowledge.update(fact,correct,1);
    }


    console.log(result + " av " + number_of_facts + " rÃ¤tt");
    var grade = result / number_of_facts;
    var resultText = "";
    if(grade < 0.5){
        resultText = "Det gick inte sÃ¥ bra.";
    }
    else{
        $.post(
            '{% url 'hWorld.views.updateProgress' %}',
        {
            "activity": "conceptsMap",
            "csrfmiddlewaretoken": getCookie('csrftoken')
        }
    );
        if(grade < 0.75){
            resultText = "Det gick sÃ¥dÃ¤r.";

        }
        else{
            resultText = "Det gick bra.";
        }

    }

    $.post(
        '{% url 'hWorld.views.updateConceptsMapAgentBeliefs' %}',
         {
            "beliefs": JSON.stringify(agentKnowledge.beliefs),
            "csrfmiddlewaretoken": getCookie('csrftoken')
         });

    logger.log("User","ResultDisplayed", resultText, 0);

    var fullOverlay = jQuery('<div>', {
        id: "overl"
    }, '</div>');

    fullOverlay.appendTo($("body"));
    fullOverlay.css("display","initial");
    fullOverlay.css("opacity","0.5");


    var resultOverlay = jQuery('<div>', {
        id: "finishedDialog"
    }, '</div>');
    resultOverlay.appendTo($("#board"));
    resultOverlay.offset({top: 250});

    resultOverlay.html(resultText + "<br><br>");

    var finishedForm = jQuery('<form>', {
        id: "finishedForm",
        action: "{% url 'hWorld.views.selectLearnActivity' %}"
    }, '</form>');

    var finishedButton = jQuery('<button>', {
        id: "finishedButton"
    }, '</button>');

    finishedButton.html("OK");
    finishedButton.click();

    finishedForm.appendTo(resultOverlay);
    finishedButton.appendTo(finishedForm);
}


window.onresize = function onresize(){
    initOverlay($("#concepts_overlay"), conceptContainer);
    initOverlay($("#relations_overlay"), relationContainer);
}



var loadAgentBeliefs = function() {
	$.post(
		'{% url 'hWorld.views.getConceptsMapAgentBeliefs' %}',
		{
			"concepts": concepts,
			"relations": relations,
			"csrfmiddlewaretoken": getCookie('csrftoken')
		},
		function(json) {
			// Get the agents knowledge.
			jQuery.each(json, function(index,value) {
				agentKnowledge.beliefs[index] =
					new AgentBelief(
						value['id'],
						value['startConcept'],
						value['relation'],
						value['endConcept'],
						value['isCorrect'],
						value['certainty']
					);
			});
			loadAgentConfig();
		},
		"json"
	);
}
// Loads the relavant configuration associated with the active agent type.
var loadAgentConfig = function() {

	$.post(
		'{% url 'hWorld.views.getAgentConfig' %}',
		{
			"activity": "timeLine",
			"csrfmiddlewaretoken": getCookie('csrftoken')
		},
		function(json) {
			agentConfig = json;
		},
		"json"
	);
}
