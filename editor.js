var arrobj = new Array();

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
        arrobj.push({
            "type": type,
            "measure": measure,
            "lane": lane,
            "position": position,
            "split": split,
            "option": option
        });
        $("#output").html( JSON.stringify(arrobj, null, 4) );
    })
} );