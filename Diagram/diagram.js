

let createArrowSpacerId = (index, height, width) => {
    return "diagram-table-arrow-" + index + "-" + height + "-" + width;
}
let createArrowSpacer = (index, height, width) => {
    return $("<td></td>")
        .append($("<div></div>", { id: createArrowSpacerId(index, height, width) })
            .attr("hidden", "true")
            .addClass("diagram-spacer")
            .append($("<i></i>")
                .addClass("glyphicon")
                .addClass("glyphicon-arrow-right")
            )
        );
};

let createSpacer = () => {
    return $("<td></td>")
        .append($("<div></div>", {})
            .addClass("diagram-spacer")
        );
};

let createSlotId = (index, height, width) => {
    return "diagram-table-slot-" + index + "-" + height + "-" + width;
}
let createSlot = (index, height, width) => {
    return $("<td></td>")
        .append($("<div></div>", { id: createSlotId(index, height, width) })
            .attr("hidden", "true")
            .addClass("diagram-slot")
        );
}

let createDiagramTable = (index, height, width) => {
    let table = $("<table></table>");
    let tbody = $("<tbody></tbody>");
    table.append(tbody);

    for (var h = 0; h < height; h++) {
        let itemRow = $("<tr></tr>");
        var spacerRow = $("<tr></tr>");

        for (var w = 0; w < width; w++) {
            itemRow.append(createSlot(index, h, w));
            spacerRow.append(createSpacer());

            if (w + 1 != width) {
                itemRow.append(createArrowSpacer(index, h, w));
                spacerRow.append(createSpacer());
            }
        }

        tbody.append(itemRow);
        tbody.append(spacerRow);
    }

    return table;
};

let createUnconnectedDiv = (items) => {
    let unconnectedDiv = $("<div></div>")

    items.forEach((item, index) => {
        unconnectedDiv.append(createDiagramItem(item));
    });

    return unconnectedDiv;
}

let createDiagramItem = (item) => {
    var cogTd;
    if (item_type.cogless === item.type) {
        cogTd = $("<td></td>")
            .append($("<div></div>")
                .addClass("btn-xs")
            );
    } else {
        cogTd = $("<td></td>")
            .append($("<a></a>")
                .attr("href", "#")
                .addClass("glyphicon")
                .addClass("glyphicon-cog")
                .addClass("btn-xs")
                .click((event) => {
                    // TODO: Display a modal
                    alert(JSON.stringify(item));
                })
            );
    }


    return $("<div></div>")
        .addClass("diagram-item")
        .addClass("js-diagram-item")
        .addClass("js-diagram-item-" + item.input)
        .attr("input", item.input)
        .attr("output", item.output)
        .append($("<table></table>")
            .append($("<thead></thead>")
                .append($("<tr></tr>")
                    .append($("<td></td>")
                        .text(item.name)
                    )
                )
            )
            .append($("<tbody></tbody>")
                .append($("<tr></tr>")
                    .addClass("diagram-item-table-top")
                    .append($("<td></td>")
                        .text(item.input)
                    )
                    .append(cogTd)
                    .append($("<td></td>")
                        .text(item.output)
                    )
                )
                .append($("<tr></tr>")
                    .addClass("diagram-item-table-bottom")
                    .append($("<td></td>", { id: "diagram-item-input-" + item.input })
                        .text("--")
                    )
                    .append($("<td></td>")
                        .text("")
                    )
                    .append($("<td></td>", { id: "diagram-item-output-" + item.output })
                        .text("--")
                    )
                )
            )
        )
};

let item_type =
    {
        one: "one"
        , two: "two"
        , cogless: "cogless"
        , connector: "connector"
    }

/**
 * Creates the HTML for a diagram.
 * 
 * @param {any} items list of objects {name: String, type: String, input: Number, Output: [Number]}
 * @param {any} pairs list of objects map of input=output (both Numbers)
 * @param {any} protected list of numbers that correspond to a protected input
 */
var selectedName = null;
let generateLayouts = (items, pairs, protected) => {
    let available = [];
    let layouts = {};

    let createItem = (item, output) => {
        return { name: item.name, type: item.type, input: item.input, output: output };
    };

    let getItemByInput = (input) => {
        return items.reduce((previous, item, index) => previous || (item.input === input ? item : null), false);
    };


    items.forEach((item, index) => {
        let anOutputConnected = !!item.outputs.reduce((previous, output, index) => pairs[output], false);
        let anInputConnected = Object.values(pairs).reduce((previous, input, index) => previous || (input === item.input), false);
        let inProtected = protected.reduce((previous, input, index) => previous || (input === item.input), false);

        let hasAnOutput = (item.outputs.length > 0);
        let hasAnInput = !!item.input;

        if (anInputConnected) {
            /* Item is in the middle of a chain */
            if (inProtected) {
                available.push(item);
            }
        }

        if (!anInputConnected && hasAnOutput) {
            /* Item is the start of a chain */
            if (inProtected || !anOutputConnected) {
                available.push(item);
            }

            let chain = { width: 1, height: item.outputs.length, grid: {} };
            let stack = item.outputs.map((output, h) => {
                return { w: 0, h: h, item: createItem(item, output) };
            });

            for (var link = stack.pop(); link; link = stack.pop()) {
                if (!chain.grid.hasOwnProperty(link.h)) {
                    chain.grid[link.h] = {};
                }
                chain.grid[link.h][link.w] = link.item;

                let nextLink = getItemByInput(pairs[link.item.output]);
                if (nextLink) {
                    // Chain stops
                    if (nextLink.outputs.length == 0) {
                        let nextW = link.w + 1;

                        chain.width = Math.max(chain.width, nextW + 1);

                        stack.push({ w: nextW, h: link.h, item: createItem(nextLink, null) });
                    }

                    // Chain continues
                    nextLink.outputs.forEach((output, index) => {
                        let nextW = link.w + 1;
                        let nextH = link.h + index;

                        chain.width = Math.max(chain.width, nextW + 1);
                        chain.height = Math.max(chain.height, nextH + 1);

                        stack.push({ w: nextW, h: nextH, item: createItem(nextLink, output) });
                    });
                } else if (link.item.output) {
                    let nextW = link.w + 1;

                    chain.width = Math.max(chain.width, nextW + 1);

                    chain.grid[link.h][nextW] = { type: item_type.connector, output: link.item.output }
                }
            }

            layouts[item.name] = chain;
        }
    });

    let diagramAnchor = $('#diagram-anchor');
    diagramAnchor.html('');

    let diagramNavUl = $("<ul></ul>")
        .addClass("nav")
        .addClass("nav-tabs");
    let diagramLayoutDiv = $("<div></div>")
        .addClass("tab-content");
    let diagramAvailableDiv = $("<div></div>")
        .addClass("unconnected-slot")
        .addClass("js-unconnected-div")
        .addClass("js-diagram-slot");

    diagramAnchor.append(diagramNavUl)
        .append(diagramLayoutDiv)
        .append(diagramAvailableDiv);


    Object.keys(layouts).forEach((name, index) => {
        if(!selectedName || !layouts[selectedName]){
            selectedName = name;
        }

        let selected = (name === selectedName);
        let layout = layouts[name];
        // Add Nav Tab Item
        diagramNavUl.append($("<li></li>")
            .addClass(selected ? "active" : "")
            .append($("<a></a>")
                .attr("data-toggle", "tab")
                .attr("href", "#diagram-tab-" + index)
                .text(name)
                .click((event) => {
                    selectedName = name;
                })
            )
        );

        // Create Table
        diagramLayoutDiv.append($("<div></div>", { id: "diagram-tab-" + index })
            .addClass("tab-pane")
            .addClass("fade")
            .addClass(selected ? "in" : "")
            .addClass(selected ? "active" : "")
            .append(createDiagramTable(index, layout.height, layout.width))
        );

        for (var w = 0; w < layout.width; w++) {
            for (var h = 0; h < layout.height; h++) {
                let item = layout.grid[h][w];

                if (item) {
                    let slot = $("#" + createSlotId(index, h, w));
                    let spacer = $("#" + createArrowSpacerId(index, h, w));

                    slot.attr("hidden", false);
                    spacer.attr("hidden", !item.output);

                    if (item_type.connector == item.type) {
                        slot.attr("output", item.output)
                            .addClass("output-connector")
                            .addClass("js-diagram-slot")
                            .addClass("js-output-connector");
                    } else {
                        /* Cog-less for unknown types */
                        slot.append(createDiagramItem(item));
                    }
                }
            }
        }
    });

    diagramAvailableDiv.append(createUnconnectedDiv(available));
};

$(() => {

    let data =
        {
            items: [{ name: "1:2 #1", type: item_type.cogless, input: 1, outputs: [9, 10] }
                , { name: "1:2 #2", type: item_type.cogless, input: 2, outputs: [11, 12] }
                , { name: "3->13", type: item_type.one, input: 3, outputs: [13] }
                , { name: "4->14", type: item_type.one, input: 4, outputs: [14] }
                , { name: "5->15", type: item_type.two, input: 5, outputs: [15] }
                , { name: "6->16", type: item_type.two, input: 6, outputs: [16] }
                , { name: "7 (dead)", type: item_type.two, input: 7, outputs: [] }
                , { name: "8 (dead)", type: item_type.cogless, input: 8, outputs: [] }
            ]
            , pairs: {
                13: 1
                , 9: 6
                , 10: 8
                , 15: 2
            }
        };

    generateLayouts(data.items, data.pairs, [5, 6, 7, 8]);

    $(".js-diagram-slot").droppable({
        drop: (event, ui) => {
            let dst = $(event.target);
            let item = ui.draggable;

            item.detach().appendTo(dst);

            if (dst.hasClass("js-output-connector")) {
                let output = dst.attr("output");
                let input = item.attr("input");

                // TODO: Actually make a REST call
                alert("Connect output: [" + output + "], input:[" + input + "]");
            }

            if (dst.hasClass("js-unconnected-div")) {
                let input = item.attr("input");

                if (input) {
                    // TODO: Actually make a REST call
                    alert("Disconnect input:[" + input + "]");
                }
            }
        }
    });

    $(".js-diagram-item").draggable({
        snap: ".js-diagram-slot"
        , revert: true
        , revertDuration: 0
        , snapMode: "inner"
        , snapTolerance: 20

    });
});