var fumenObject = {
    "raku": [], "easy": [], "normal": [], "hard": [], "extra": []
};
var prev = {
    "raku": null, "easy": null, "normal": null, "hard": null, "extra": null
};
var measureHeight = 200;
var currentLevel = "easy"
let preAudio = new Audio();
let INTERVAL;

$(document).ready( function(){
    $("#output").html( JSON.stringify(fumenObject, null, 4) );

    //ノーツを追加
    $("#form-add").on("click", ()=>{
        prev[currentLevel] = fumenObject[currentLevel];
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
        let option = [];
        if( type == 97 || type == 98 ){
            if( type == 97 ) option[0] = "beatchange";
            else if( type == 98 ) option[0] = "bpmchange";
            option[1] = Number($("#form-option").val());
        }
        let end = [];
        if( type == 2 ){
            end = [
                {
                    "type": 1,
                    "measure": Number($("#endform-measure").val()),
                    "lane": Number($("#endform-lane").val()),
                    "position": Number($("#endform-position").val()),
                    "split": Number($("#endform-split").val()),
                    "option": -1,
                    "end": []
                }
            ]
        }
        // 音札ノーツは全難易度に挿入
        if( type == 5 ){
            let _otofudanotesobj = {
                "type": type,
                "measure": measure,
                "lane": lane,
                "position": position,
                "split": split,
                "option": option,
                "end": end
            }
            try {
                fumenObject.raku.push( _otofudanotesobj );
                fumenObject.easy.push( _otofudanotesobj );
                fumenObject.normal.push( _otofudanotesobj );
                fumenObject.hard.push( _otofudanotesobj );
                fumenObject.extra.push( _otofudanotesobj );
                message("音札ノーツを全ての難易度の同一箇所に挿入しました");
            } catch (error) {
                message( error );
            }
        }
        else fumenObject[currentLevel].push({
            "type": type,
            "measure": measure,
            "lane": lane,
            "position": position,
            "split": split,
            "option": option,
            "end": end
        });
        $("#output").html( JSON.stringify(fumenObject, null, 4) );

        drawPreview(fumenObject[currentLevel]);
    });

    //小節の高さ
    if( localStorage.getItem("fumenedit-measure-height") ) measureHeight = Number( localStorage.getItem("fumenedit-measure-height") );
    $("#measure-height-num").text(measureHeight);
    $("#measure-height").val(measureHeight).on("change", function(){
        measureHeight = this.value;
        $("#measure-height-num").text(measureHeight);
        localStorage.setItem("fumenedit-measure-height", this.value);
        selectLevel(currentLevel);
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
        //Shift押しながら上下でノーツ(始点)移動
        else if( e.shiftKey ){
            if( e.which == 38 ){
                $("#form-position").val( Number($("#form-position").val()) +1 );
            }
            else if( e.which == 40 ){
                $("#form-position").val( Number($("#form-position").val()) -1 );
            }
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
        }
        //スペースキーでノーツタイプ変更
        else if( e.which == 32 ){
            if( $("#form-type").val() == 99 ) $("#form-type").val(1);
            else if( $("#form-type").val() == 5 ) $("#form-type").val(97);
            else $("#form-type").val( Number($("#form-type").val()) + 1);

            if( $("#form-type").val() == 2 ) $("#endform").show();
            else $("#endform").hide();
        }
    }).on("keyup keydown keypress", () => drawShadow() );

    //小節前後移動
    $("#form-prev").on("click", () => $("#form-measure").val( Number($("#form-measure").val()) -1 ) );
    $("#form-next").on("click", () => $("#form-measure").val( Number($("#form-measure").val()) +1 ) );

    //UndoとRedo
    $("#form-undo").on("click", ()=>{
        if( prev[currentLevel] ){
            fumenObject[currentLevel] = prev[currentLevel];
            prev[currentLevel] = null;
        }
        else message("Undoできません");
        $("#output").html( JSON.stringify(fumenObject, null, 4) );
        drawPreview(fumenObject[currentLevel]);
    });

    $("#form-redo").on("click", ()=>{
        if( !prev[currentLevel] ){
            message("Redoできません");
            return;
        };
        fumenObject[currentLevel].push( prev[currentLevel] );
        prev[currentLevel] = null;
        $("#output").html( JSON.stringify(fumenObject, null, 4) );
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

    //クリップボードにコピー
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

    //シャドーノーツ(置く場所の目印)を表示
    $("input, select").on("change", () => drawShadow() );

    //フォームのタイプ変更時
    $("#form-type").on("change", function(){
        //ノーツタイプによってoptionキーの種類を表示
        let _type = $("#form-type").val();
        if( _type == 97 ) $("#form-option-key").text("beatchange");
        else if( _type == 98 ) $("#form-option-key").text("bpmchange");
        else if( _type == 3 || _type == 4 ) $("#form-option-key").text("notewidth");
        else $("#form-option-key").text("使用なし");

        //ロングなら終点フォームを表示
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
    let notesnum = 0, notesid = 0, maxMeasure = 0;
    //1ノートずつ処理
    for( let i of obj ){
        notesid++;
        if( i.type == 1 || i.type == 2 || i.type == 3 || i.type == 4 || i.type == 5 ) notesnum++;
        if( Number(i.measure) > maxMeasure ) maxMeasure = Number(i.measure);
        $("#preview").append(`<span id='note${notesid}' data-n='${(notesid-1)}'><i class='noteinfo'>${i.position}/${i.split}</i></span>`);
        let noteEl = $("#note"+notesid);
        noteEl.addClass("type"+i.type).css("right", (Number(i.lane)-1)*60 ).css("top", (Number(i.measure)*measureHeight) + measureHeight*(Number(i.position)/Number(i.split)) );
        if( i.type == 98 ){
            noteEl.text(i.option);
        }
        else if( i.type == 97 ){
            noteEl.text(i.option+"/4");
        }
        else if( i.type == 99 ){
            noteEl.text("EOF");
        }
        else if( i.type == 2 ){
            for( let j in i.end ){
                noteEl.text(notesid);
                if( Number(i.end[j].measure) > maxMeasure ) maxMeasure = Number(i.end[j].measure);
                $("#preview").append("<span id='end"+notesid+"-"+j+"' data-n='"+(notesid-1)+"'>"+notesid+"</span>");
                $("#end"+notesid+"-"+j).addClass("type"+i.end[j].type).css("right", (Number(i.end[j].lane)-1)*60 ).css("top", (Number(i.end[j].measure)*measureHeight) + measureHeight*(Number(i.end[j].position)/Number(i.end[j].split)) );
                if( i.lane == i.end[j].lane ){
                    $("#preview").append("<i id='long"+notesid+"-"+j+"' data-n='"+(notesid-1)+"'></i>");
                    $("#long"+notesid+"-"+j).addClass("long").css("right", (Number(i.lane)-1)*60 ).css("top", (Number(i.measure)*measureHeight) + measureHeight*(Number(i.position)/Number(i.split))).css("height", Math.abs( ((Number(i.measure)*measureHeight) + measureHeight*(Number(i.position)/Number(i.split))) - ((Number(i.end[j].measure)*measureHeight) + measureHeight*(Number(i.end[j].position)/Number(i.end[j].split))) ) );
                }
            }
        }
        // キャンバス描画用(使用なし)
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
        prev[currentLevel] = fumenObject[currentLevel];
        if( fumenObject[currentLevel][this.getAttribute("data-n")].type == 5 ) message("[注意]音札ノーツを削除する場合は、全ての難易度で削除されているか確認してください");
        fumenObject[currentLevel].splice( this.getAttribute("data-n"),1 );
        drawPreview( fumenObject[currentLevel] );
    });

    //小節線の描画
    for( let i = 0; i <= maxMeasure; i++ ){
        $("#preview").append("<span id='measure"+i+"'>"+i+"</span>");
        let measureEl = $("#measure"+i);
        measureEl.addClass("measure").css("top", i*measureHeight);
    }

    //プレビュー線の描画
    $("#preview").append("<div id='preline'>プレビュー</div>");
    clearInterval(INTERVAL);

    $(".measure").css("height", measureHeight + "px");
    $("#notesnum").text(notesnum+" notes");
    drawShadow();
}

function message( text ){
    $("#debug").show().text( text ).on("click", ()=> $("#debug").hide() );
}

function drawShadow(){
    let _type = $("#form-type").val();

    $("#noteShadow, #noteShadowEnd, #long-shadow").remove();
    $("#preview").append("<span id='noteShadow'></span>");
    $("#noteShadow").addClass("type"+_type).css("right", (Number($("#form")[0].lane.value)-1)*60 ).css("top", (Number($("#form-measure").val())*measureHeight) + measureHeight*(Number($("#form-position").val())/Number($("#form-split").val())) );

    //シャドー終点の描画
    if( _type == 2 ){
        $("#noteShadow").text("n");
        $("#preview").append("<span id='noteShadowEnd'>n</span>");
        $("#noteShadowEnd").addClass("type"+$("#endform-type").val()).css("right", (Number($("#endform-lane").val())-1)*60 ).css("top", (Number($("#endform-measure").val())*measureHeight) + measureHeight*(Number($("#endform-position").val())/Number($("#endform-split").val())) );
        $("#preview").append("<i id='long-shadow'></i>");
        $("#long-shadow").addClass("long").css("right", (Number($("#endform-lane").val())-1)*60 )
        .css("top", Number( $("#form-measure").val() ) * measureHeight + measureHeight * ( Number( $("#form-position").val() ) / Number( $("#form-split").val() ) ) )
        .css("height", Math.abs( ( Number($("#form-measure").val() ) * measureHeight) + measureHeight * ( Number( $("#form-position").val() ) / Number( $("#form-split").val() ) ) - ( ( Number( $("#endform-measure").val() ) * measureHeight ) + measureHeight * ( Number( $("#endform-position").val() ) / Number( $("#endform-split").val() ) ) ) ) );
    }
}

function selectLevel( level ){
    if( !fumenObject[level] ){
        message( level + "は不明な難易度です");
    }
    else{
        currentLevel = level;
        message( level + "をロードしました");
        $("#output").html( JSON.stringify(fumenObject, null, 4) );
        drawPreview(fumenObject[currentLevel]);
        $("#head-level").text(level);
    }
}

function openFile(){
    if( window.confirm("ファイルを開くと保存していない現在の内容は破棄されます。\n続行しますか？") ){
        let reader = new FileReader();
        reader.onload = function(event) {
            fumenObject = JSON.parse( event.target.result );
            prev = {
                "raku": null, "easy": null, "normal": null, "hard": null, "extra": null
            };
            console.log(fumenObject);
            $("#output").html( JSON.stringify(fumenObject, null, 4) );
            selectLevel(currentLevel);
        };

        $('<input type="file" accept=".json, application/json">').on('change', function(event) {
            reader.readAsText(event.target.files[0]);
        })[0].click();
    }
}

function saveFile(){
    let blob = new Blob([JSON.stringify(fumenObject, null, 4)], { type: "application/json" });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '曲名.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function previewStart(){
    preAudio.pause();
    //preAudio = new Audio();
    $("#preline").css("top", "0px");
    $("#preline").css("transition", "none");
    //preAudio.src = $("#preview-file").val();
    let _bpm = $("#preview-bpm").val();
    let _beat = $("#preview-beat").val();
    let _height = 0;
    let _start = $("#preview-measure").val();
    clearInterval(INTERVAL);

    //1小節ずつ進行
    _height +=  Number(_start) * (Number(measureHeight));
    $("#preline").css("top", _height + "px");
    $("#preline").css("transition", (60/_bpm*_beat)+"s all linear");
    
    INTERVAL = setInterval(() => {
        _height += Number(measureHeight);
        $("#preline").css("top", _height + "px");
        $("#preline").css("transition", (60/_bpm*_beat)+"s all linear");
    }, (60/_bpm*_beat)*1000 );
    //音源オフセット分遅延再生
    setTimeout(() => {
        preAudio.currentTime = (60/_bpm*_beat)*Number(_start);
        preAudio.play().catch( (err)=>console.warn(err) );
    }, Number($("#preview-offset").val()) );
}

function previewStop(){
    clearInterval(INTERVAL);
    $("#preline").css("top", "0px");
    $("#preline").css("transition", "none");
    preAudio.pause();
}

function selectPreaudio(files){
    preAudio = new Audio();
    preAudio.src = window.URL.createObjectURL(files[0]);
}
