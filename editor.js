var arrobj = new Array();
var prev;

$(document).ready( function(){
    $("#output").html( JSON.stringify(arrobj, null, 4) );

    $("#form-add").on("click", ()=>{
        let type = Number($("#form-type").val())
        let measure = Number($("#form-measure").val());
        let lane = -1;
        if( type == 1 || type ==2 ){
            lane = Number($("#form-lane").val());
        }
        let position = Number($("#form-position").val());
        let split = Number($("#form-split").val());
        let option = Number($("#form-option").val());
        let end = {};
        if( type == 2 ){
            end = [
                {
                    "type": 1,
                    "measure": Number($("#endform-measure").val()),
                    "lane": Number($("#endform-lane").val()),
                    "position": Number($("#endform-position").val()),
                    "split": Number($("#endform-split").val()),
                    option: -1,
                    end: new Array()
                }
            ]
        }
        arrobj.push({
            "type": type,
            "measure": measure,
            "lane": lane,
            "position": position,
            "split": split,
            "option": option,
            "end": end
        });
        $("#output").html( JSON.stringify(arrobj, null, 4) );
    });

    $("#form-undo").on("click", ()=>{
        prev = arrobj.pop() || prev;
        $("#output").html( JSON.stringify(arrobj, null, 4) );
    });

    $("#form-redo").on("click", ()=>{
        if( !prev ){
            $("#debug").text("Redoできません。");
            return;
        };
        arrobj.push( prev );
        prev = null;
        $("#output").html( JSON.stringify(arrobj, null, 4) );
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

    $("#debug").text("読み込みが完了しました。");
} );
