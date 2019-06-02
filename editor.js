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

    // ノーツを追加
    $("#form-add").on("click", ()=>{
        let type = Number($("#form-type").val())
        let measure = Number($("#form-measure").val());

        let lane = -1;
        if( type == 1 || type ==2 ){
            lane = Number($("#form")[0].lane.value);
        }
        else if( type == 3 || type == 4 ){
            lane = Number($("#form")[0].lane.value);
            if( lane == 1 || lane == 5 ){
                message("そのレーン位置にフリックノーツを配置することはできません。");
                return;
            }
        }
        else if( type == 5 ) lane = 3;

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

    //キーボード操作
    $(document).on("keyup", (e) => {
        //Enterキーでノート追加
        if( e.which == 13 ) $("#form-add").click();
        //左右キーでlane移動
        else if( e.which == 37 ){
            $("#form")[0].lane.value = Number($("#form")[0].lane.value) - 1;
            $("#endform-lane").val( $("#form")[0].lane.value );
        }
        else if( e.which == 39 ){
            $("#form")[0].lane.value = Number($("#form")[0].lane.value) + 1;
            $("#endform-lane").val( $("#form")[0].lane.value );
        }
    }).on("keyup keydown keypress", () => drawShadow() );

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
        let pos = Number($("#form-position").val());
        let spl = Number($("#form-split").val());
        if( pos < 0 ){
            $("#form-position").val(0);
        };
        if( pos == spl ){
            $("#form-position").val(0);
            $("#form-next").click();
        };
        if( pos == -1 ){
            $("#form-position").val( spl-1 );
            $("#form-prev").click();
        };
        if( spl < 1 ){
            $("#form-split").val(1);
        };
    });
    $("#endform-position").on("change", ()=>{
        let pos = Number($("#endform-position").val());
        let spl = Number($("#endform-split").val());
        if( pos < 0 ){
            $("#endform-position").val(0);
        };
        if( pos == spl ){
            $("#endform-position").val(0);
            $("#endform-measure").val( Number($("#endform-measure").val()) + 1 );
        };
        if( pos == -1 ){
            $("#endform-position").val( spl-1 );
            $("#endform-measure").val( Number($("#endform-measure").val()) - 1 );
        };
        if( spl < 1 ){
            $("#endform-split").val(1);
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

    $("input, select").on("change", () => drawShadow() );

    $("#form-type").on("change", function(){
        if( this.value == 2 ) $("#endform").show();
        else $("#endform").hide();

        if( this.value == 97 || this.value == 98 ){
            $("#form-option").css("background", "yellow");
        }
        else{
            $("#form-option").css("background", "");
        }
    });

    message( currentLevel + "をロードしました");
} );

function drawPreview(obj){
    $("#preview").html("<canvas id='canvas' width='300'></canvas>");
    let notesnum = 0, maxMeasure = 0;
    //1ノートずつ処理
    for( let i of obj ){
        notesnum++;
        if( Number(i.measure) > maxMeasure ) maxMeasure = Number(i.measure);
        $("#preview").append("<span id='note"+notesnum+"' data-n='"+(notesnum-1)+"'></span>");
        let noteEl = $("#note"+notesnum);
        noteEl.addClass("type"+i.type).css("right", (Number(i.lane)-1)*60 ).css("top", (Number(i.measure)*measureHeight) + measureHeight*(Number(i.position)/Number(i.split)) );
        if( i.type == 98 ){
            noteEl.text("BPM:"+i.option);
        }
        else if( i.type == 97 ){
            noteEl.text("BEAT:"+i.option+"/4");
        }
        else if( i.type == 99 ){
            noteEl.text("EOF");
        }
        else if( i.type == 2 ){
            for( let j in i.end ){
                noteEl.text(notesnum);
                if( Number(i.end[j].measure) > maxMeasure ) maxMeasure = Number(i.end[j].measure);
                $("#preview").append("<span id='end"+notesnum+"-"+j+"' data-n='"+(notesnum-1)+"'>"+notesnum+"</span>");
                $("#end"+notesnum+"-"+j).addClass("type"+i.end[j].type).css("right", (Number(i.end[j].lane)-1)*60 ).css("top", (Number(i.end[j].measure)*measureHeight) + measureHeight*(Number(i.end[j].position)/Number(i.end[j].split)) );
                if( i.lane == i.end[j].lane ){
                    $("#preview").append("<i id='long"+notesnum+"-"+j+"' data-n='"+(notesnum-1)+"'></i>");
                    $("#long"+notesnum+"-"+j).addClass("long").css("right", (Number(i.lane)-1)*60 ).css("top", (Number(i.measure)*measureHeight) + measureHeight*(Number(i.position)/Number(i.split))).css("height", Math.abs( ((Number(i.measure)*measureHeight) + measureHeight*(Number(i.position)/Number(i.split))) - ((Number(i.end[j].measure)*measureHeight) + measureHeight*(Number(i.end[j].position)/Number(i.end[j].split))) ) );
                }
            }
        }
        else if( i.type == 2 && false ){
            var ctx = document.getElementById("canvas").getContext("2d");
            for( let j in i.end ){
                noteEl.append("<span id='end"+notesnum+"-"+j+"' data-n='"+(notesnum-1)+"'></span>");
                $("#end"+notesnum+"-"+j).addClass("type"+i.end[j].type).css("right", (Number(i.end[j].lane)-1)*60 ).css("top", (Number(i.end[j].measure)*measureHeight) + measureHeight*(Number(i.end[j].position)/Number(i.end[j].split)) );
                ctx.beginPath();
                ctx.moveTo( 300-(Number(i.lane)-1)*60, (Number(i.measure)*measureHeight) + measureHeight*(Number(i.position)/Number(i.split)));
                ctx.lineTo( 300-(Number(i.end[j].lane)-1)*60, (Number(i.end[j].measure)*measureHeight) + measureHeight*(Number(i.end[j].position)/Number(i.end[j].split)) );
                console.log(ctx);
                ctx.stroke();
            }
        }
    }

    //クリックしたノートを削除
    $("#preview span").click( function(){
        prev[currentLevel] = fumenObject[currentLevel][Number(this.getAttribute("data-n"))];
        fumenObject[currentLevel].splice( this.getAttribute("data-n"),1 );
        drawPreview( fumenObject[currentLevel] );
    });

    //小節線の描画
    for( let i = 0; i <= maxMeasure; i++ ){
        $("#preview").append("<span id='measure"+i+"'>"+i+"</span>");
        let measureEl = $("#measure"+i);
        measureEl.addClass("measure").css("top", i*measureHeight);
    }
    $("#notesnum").text(notesnum+" notes");
    drawShadow();
}

function message( text ){
    $("#debug").hide().show().text( text ).fadeOut(5000);
}

function drawShadow(){
    $("#noteShadow, #noteShadowEnd, #long-shadow").remove();
    $("#preview").append("<span id='noteShadow'></span>");
    $("#noteShadow").addClass("type"+$("#form-type").val()).css("right", (Number($("#form")[0].lane.value)-1)*60 ).css("top", (Number($("#form-measure").val())*measureHeight) + measureHeight*(Number($("#form-position").val())/Number($("#form-split").val())) );

    if( $("#form-type").val() == 2 ){
        $("#noteShadow").text("n");
        $("#preview").append("<span id='noteShadowEnd'>n</span>");
        $("#noteShadowEnd").addClass("type"+$("#endform-type").val()).css("right", (Number($("#endform-lane").val())-1)*60 ).css("top", (Number($("#endform-measure").val())*measureHeight) + measureHeight*(Number($("#endform-position").val())/Number($("#endform-split").val())) );
        $("#preview").append("<i id='long-shadow'></i>");
        $("#long-shadow").addClass("long").css("right", (Number($("#endform-lane").val())-1)*60 )
        .css("top", Number( $("#form-measure").val() ) * measureHeight + measureHeight * ( Number( $("#form-position").val() ) / Number( $("#form-split").val() ) ) )
        .css("height", Math.abs( ( Number($("#form-measure").val() ) * measureHeight) + measureHeight * ( Number( $("#form-position").val() ) / Number( $("#form-split").val() ) ) - ( ( Number( $("#endform-measure").val() ) * measureHeight ) + measureHeight * ( Number( $("#endform-position").val() ) / Number( $("#endform-split").val() ) ) ) ) );
    }
}