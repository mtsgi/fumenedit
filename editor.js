var fumenObject = {
    "raku": [], "easy": [], "normal": [], "hard": [], "extra": []
};
var prev = {
    "raku": null, "easy": null, "normal": null, "hard": null, "extra": null
};
var measureHeight = 200;
var currentLevel = "easy"

$(document).ready( function(){
    $("#output").html( JSON.stringify(fumenObject[currentLevel], null, 4) );

    $("#form-add").on("click", ()=>{
        let type = Number($("#form-type").val())
        let measure = Number($("#form-measure").val());
        let lane = {};
        if( type == 1 || type ==2 ){
            lane = Number($("#form")[0].lane.value);
        }
        let position = Number($("#form-position").val());
        let split = Number($("#form-split").val());
        let option = -1;
        if( type == 97 || type == 98 ){
            option = Number($("#form-option").val());
        }
        let end = new Array();
        if( type == 2 ){
            end = [
                {
                    "type": 1,
                    "measure": Number($("#endform-measure").val()),
                    "lane": Number($("#endform-lane").val()),
                    "position": Number($("#endform-position").val()),
                    "split": Number($("#endform-split").val()),
                    "option": -1,
                    "end": new Array()
                }
            ]
        }
        fumenObject[currentLevel].push({
            "type": type,
            "measure": measure,
            "lane": lane,
            "position": position,
            "split": split,
            "option": option,
            "end": end
        });
        $("#output").html( JSON.stringify(fumenObject[currentLevel], null, 4) );

        drawPreview(fumenObject[currentLevel]);
    });

    $("#form-load").on("click", ()=>{
        let _level = $("#form-level").val();
        if( !fumenObject[_level] ){
            message( _level + "は不明な難易度です");
        }
        else{
            currentLevel = _level;
            message( _level + "をロードしました");
            $("#output").html( JSON.stringify(fumenObject[currentLevel], null, 4) );
            drawPreview(fumenObject[currentLevel]);
        }
    });

    //小節前後移動
    $("#form-prev").on("click", () => $("#form-measure").val( Number($("#form-measure").val()) -1 ) );
    $("#form-next").on("click", () => $("#form-measure").val( Number($("#form-measure").val()) +1 ) );

    //UndoとRedo
    $("#form-undo").on("click", ()=>{
        prev[currentLevel] = fumenObject[currentLevel].pop() || prev[currentLevel];
        $("#output").html( JSON.stringify(fumenObject[currentLevel], null, 4) );
        drawPreview(fumenObject[currentLevel]);
    });

    $("#form-redo").on("click", ()=>{
        if( !prev[currentLevel] ){
            message("Redoできません");
            return;
        };
        fumenObject[currentLevel].push( prev[currentLevel] );
        prev[currentLevel] = null;
        $("#output").html( JSON.stringify(fumenObject[currentLevel], null, 4) );
        message("Redoしました");
        drawPreview(fumenObject[currentLevel]);
    });

    //次の小節に移動
    $("#form-position").on("change", ()=>{
        let pos = $("#form-position").val();
        let spl = $("#form-split").val();
        if( pos < 0 ){
            $("#form-position").val(0);
        }
        if( pos == spl ){
            $("#form-position").val(0);
            $("#form-next").click();
        };
    });


    $("#copy2cb").on("click", function(){
        let _range = document.createRange();
        _range.selectNode( $("#output")[0] );
        let _selection = getSelection();
        _selection.removeAllRanges();
        _selection.addRange(_range);
        document.execCommand("copy");
        _selection.removeAllRanges();
        $("#debug").text("クリップボードにコピーしました。");
    });

    $("#form-type").on("change", function(){
        if( this.value == 2 ) $("#endform").show();
        else $("#endform").hide();
    });

    message( currentLevel + "をロードしました");
} );

function drawPreview(obj){
    $("#preview").html("");
    let notesnum = 0, maxMeasure = 0;
    //1ノートずつ処理
    for( let i of obj ){
        notesnum++;
        if( Number(i.measure) > maxMeasure ) maxMeasure = Number(i.measure);
        $("#preview").append("<span id='note"+notesnum+"'></span>");
        let noteEl = $("#note"+notesnum);
        noteEl.addClass("type"+i.type).css("right", (Number(i.lane)-1)*60 ).css("top", (Number(i.measure)*measureHeight) + measureHeight*(Number(i.position)/Number(i.split)) );
        if( i.type == 98 ){
            noteEl.text("BPM:"+i.option);
        }
        else if( i.type == 97 ){
            noteEl.text("BEAT:"+i.option+"/4");
        }
    }
    //小節線の描画
    for( let i = 0; i <= maxMeasure; i++ ){
        $("#preview").append("<span id='measure"+i+"'>"+i+"</span>");
        let measureEl = $("#measure"+i);
        measureEl.addClass("measure").css("top", i*measureHeight);
    }
    $("#notesnum").text(notesnum+" notes");
}

function message( text ){
    $("#debug").text( text );
}