const $= require('jquery');
const { getDefaultSettings } = require('http2');
const { parse } = require('path');
const electron = require('electron').remote;
const dialog = electron.dialog;
const fsp = require('fs').promises;
let rows=[];
$(document).ready(function()
{
    function getDefaultCell()
    {
        let cobj = {
            val:'',
            fontFamily:'Georgia',
            fontSize: 10 ,
            bold:false,
            underline:false,
            bgColor:'#FFFFFF',
            textColor:'#000000',
            valign:'middle',
            halign:'left',
            formula:'',
            upstream:[],
            downstream:[]
        }
        return cobj;
    }
    function prepareCellDiv(cdiv,cobj)
    {
        $(cdiv).html(cobj.val);
        $(cdiv).css('font-family',cobj.fontFamily);
        $(cdiv).css('font-size',cobj.fontSize+'px');
        $(cdiv).css('font-weight',cobj.bold? 'bold' : 'normal');
        $(cdiv).css('font-style',cobj.italic ? 'italic' : 'normal');
        $(cdiv).css('text-decoration',cobj.underline ? 'underline' : 'none');
        $(cdiv).css('background-color',cobj.bgColor);
        $(cdiv).css('color',cobj.textColor);
        $(cdiv).css('text-align',cobj.halign);

    }
    function evaluateFormula(cobj)
    {
        let formula = cobj.formula;
        for(let i=0;i<cobj.upstream.length;i++)
        {
            let uso = cobj.upstream[i];
            let fuso = rows[uso.rid][uso.cid];
            let cellName = String.fromCharCode('A'.charCodeAt(0)+uso.cid)+(uso.rid+1);//row 0 =>1
            formula = formula.replace(cellName,fuso.val || 0);
        }
        console.log(formula);
        console.log(typeof formula)
        let nval = eval(formula);
        return nval;
    }
    function updateVal(rid,cid,val,render)
    {
        let cobj = rows[rid][cid];
        cobj.val = val;
        if(render)
        {
            $('.cell[ rid=' + rid + '][cid=' + cid + ']').html(val);
        }
        for(let i=0;i<cobj.downstream.length;i++)
        {
            let dso = cobj.downstream[i];
            let fdso = rows[dso.rid][dso.cid];
            let nval = evaluateFormula(fdso);
            updateVal(dso.rid,dso.cid,nval,true);
        }
    }

    function deleteFormula(rid,cid)
    {
        let cobj = rows[rid][cid];
        cobj.formula = '';
        for(let i=0;i<cobj.upstream.length;i++)
        {
            let uso = cobj.upstream[i];
            let fuso = rows[uso.rid][uso.cid];
            for(let j=0;j<fuso.downstream.length;j++)
            {
                let dso = fuso.downstream[j];
                if(dso.rid==rid && dso.cid == cid)
                {
                    fuso.downstream.splice(j,1);
                    break;
                }
            }
        }
        cobj.upstream =[];
    }
    function setupFormula(rid,cid,formula)
    {
        let cobj = rows[rid][cid];
        cobj.formula = formula;
        formula = formula.replace('(','').replace(')','');
        let comps = formula.split(' ');
        for(let i=0;i<comps.length;i++)
        {
            if(comps[i].charCodeAt(0)>="A".charCodeAt(0) && comps[i].charCodeAt(0)<="Z".charCodeAt(0))
            {
                let urid = parseInt(comps[i].substr(1)) -1;
                let ucid = comps[i].charCodeAt(0)-"A".charCodeAt(0);
                cobj.upstream.push(
                    {
                        rid:urid,
                        cid:ucid
                    }
                )
                let fuso = rows[urid][ucid];
                fuso.downstream.push({
                    rid:rid,
                    cid:cid
                })
            }
        }
    }

    $('#content-container').on('scroll',function(){
    console.log($('#content-container').scrollTop() + " "+ $('#content-container').scrollLeft());
    $('#first-row').css('top',$('#content-container').scrollTop()+"px");
    $('#first-col').css('left',$('#content-container').scrollLeft()+"px");
    $('#tl-cell').css('top',$('#content-container').scrollTop()+"px");
    $('#tl-cell').css('left',$('#content-container').scrollLeft()+"px");
    });

    $('#new').on('click' , function()
    {
        // alert("New");
        rows=[];
        $('#grid').find('.row').each(function()
        {
            let cells=[];
            $(this).find('.cell').each(function()
            {
                let cell = getDefaultCell();
                cells.push(cell);
                prepareCellDiv(this,cell);
            })
            rows.push(cells);
            
        })
        $('#home-menu').click();
        $('#grid .cell:first').click();
    })

    $('#font-size').on('change',function()
    {
        let fontsize = $(this).val();

        $('#grid .cell.selected').each(function()
        {
            $(this).css('font-size',fontsize+'px');
            let rid = parseInt($(this).attr('rid'));
            let cid = parseInt($(this).attr('cid'));
           let cobj = rows[rid][cid];
           cobj.fontSize=fontsize;
        })
    })
    
    $('#font-family').on('change',function()
    {
        let fontfamily = $(this).val();
        console.log(fontfamily);
        $('#grid .cell.selected').each(function()
        {
            $(this).css('font-family',fontfamily);
            let rid = parseInt($(this).attr('rid'));
            let cid = parseInt($(this).attr('cid'));
           let cobj = rows[rid][cid];
           cobj.fontFamily=fontfamily;
        })
    })


    $('#open').on('click' ,async function()
    {
        // alert("open");
        // dialog.showOpenDialog();
        let dobj = await dialog.showOpenDialog();
        let data = await fsp.readFile(dobj.filePaths[0]);
        rows =JSON.parse(data);
        let i=0;
        $('#grid').find('.row').each(function()
        {
            let j=0;
            $(this).find('.cell').each(function()
            {
                let cell= rows[i][j];
                prepareCellDiv(this,cell);
                j++;
            })
            i++;
        })
        $('#grid .cell:first').click();
        $('#home-menu').click();

    })

    $('#save').on('click' ,async function()
    {
       let dobj = await dialog.showSaveDialog();
       await fsp.writeFile(dobj.filePath,JSON.stringify(rows));
    //    alert("Saved Successfully");
       $('#home-menu').click();
    });
    $('#menu-bar > div').on('click',function()
    {
        $('#menu-bar > div').removeClass('selected')
        $(this).addClass('selected');
        let menuConatainerId = $(this).attr('data-content');
        // console.log(menuConatainerId)
        $('#menu-content-container > div').css('display','none');
        $('#'+menuConatainerId).css('display','flex');
    })
    $('#home-menu').click();
    $('#bold').on('click', function()
    {
        $(this).toggleClass('selected');
        // let fontfamily = $(this).val();
        let bold = $(this).hasClass('selected');
        // console.log(fontfamily);
        $('#grid .cell.selected').each(function()
        {
            $(this).css('font-weight',bold==true ? 'bold' : 'normal' );
            let rid = parseInt($(this).attr('rid'));
            let cid = parseInt($(this).attr('cid'));
           let cobj = rows[rid][cid];
           cobj.bold=bold;
        })


    })
    $('#italic').on('click', function()
    {
        $(this).toggleClass('selected');
        let bold = $(this).hasClass('selected');
        // console.log(fontfamily);
        $('#grid .cell.selected').each(function()
        {
            $(this).css('font-style',bold==true ? 'italic' : 'normal' );
            let rid = parseInt($(this).attr('rid'));
            let cid = parseInt($(this).attr('cid'));
           let cobj = rows[rid][cid];
           cobj.italic=bold;
        })

    })
    $('#underline').on('click', function()
    {
        $(this).toggleClass('selected');
        let bold = $(this).hasClass('selected');
        // console.log(fontfamily);
        $('#grid .cell.selected').each(function()
        {
            $(this).css('text-decoration',bold==true ? 'underline' : 'none' );
            let rid = parseInt($(this).attr('rid'));
            let cid = parseInt($(this).attr('cid'));
           let cobj = rows[rid][cid];
           cobj.underline=bold;
        })

    })
    $('#bg-color').on('change', function()
    {
        $(this).toggleClass('selected');
        let bgcolor = $(this).val();
        // console.log(fontfamily);
        $('#grid .cell.selected').each(function()
        {
            $(this).css('background-color',bgcolor );
            let rid = parseInt($(this).attr('rid'));
            let cid = parseInt($(this).attr('cid'));
           let cobj = rows[rid][cid];
           cobj.bgColor=bgcolor;
        })

    })
    $('#text-color').on('change', function()
    {
        $(this).toggleClass('selected');
        let color = $(this).val();
        // console.log(fontfamily);
        $('#grid .cell.selected').each(function()
        {
            $(this).css('color',color );
            let rid = parseInt($(this).attr('rid'));
            let cid = parseInt($(this).attr('cid'));
           let cobj = rows[rid][cid];
           cobj.textColor=color;
        })

    })
    $('.valign').on('click', function()
    {
        $('.valign').removeClass('selected');
        $(this).addClass('selected');
    })
    $('.halign').on('click', function()
    {
        $('.halign').removeClass('selected');
        $(this).addClass('selected');
        let halign = $(this).attr('prop-val');
        $('#grid .cell.selected').each(function()
        {
            $(this).css('text-align',halign );
            let rid = parseInt($(this).attr('rid'));
            let cid = parseInt($(this).attr('cid'));
           let cobj = rows[rid][cid];
           cobj.halign=halign;
        })
        


    })
    $('#grid .cell').on('click', function(e)
    {
        if(e.ctrlKey)
        {
            $(this).addClass('selected');
        }
        else{
            $('#grid .cell').removeClass('selected');
            $(this).addClass('selected');
        }
        let rid = parseInt($(this).attr('rid'));
        let cid = parseInt($(this).attr('cid'));
       let cobj = rows[rid][cid];
       $('#font-family').val(cobj.fontFamily);
       console.log(cobj.fontFamily);
       $('#font-size').val(cobj.fontSize);
       if(cobj.bold)
       {
           $('#bold').addClass('selected');
       }
       else{
        $('#bold').removeClass('selected');
       }
       if(cobj.italic)
       {
           $('#italic').addClass('selected');
       }
       else{
        $('#italic').removeClass('selected');
       }
       if(cobj.underline)
       {
           $('#underline').addClass('selected');
       }
       else{
        $('#underline').removeClass('selected');
       }
       $('#bg-color').val(cobj.bgColor);
       $('#text-color').val(cobj.textColor);
       $('.halign').removeClass('selected');
       $('.halign[prop-val=' + cobj.halign+']').addClass('selected');
       $('#cellFormula').val(String.fromCharCode(cid + 65)+(rid+1));
       $('#txtFormula').val(cobj.formula);
    })


    $('#grid .cell').on('blur', function(e){
        let rid = parseInt($(this).attr('rid'));
        let cid = parseInt($(this).attr('cid'));
       let cobj = rows[rid][cid];
    //    console.log(e); 
    // console.log($(this).html())
    if(cobj.formula)
    {
        //agar mre paas pehle formula tha to use hta do
        $('#txtFormula').val('');
       deleteFormula(rid,cid);
    }
   updateVal(rid,cid,$(this).html(),false);
    })

    $('#txtFormula').on('blur',function()
    {
        let formula = $(this).val();
        console.log('done');
        $('#grid .cell.selected').each(function()
        {
            let rid = parseInt($(this).attr('rid'));
            let cid = parseInt($(this).attr('cid'));
            let cobj = rows[rid][cid];
            if(cobj.formula)
            {
                deleteFormula(rid,cid);
            }
            setupFormula(rid,cid,formula);
            let nval = evaluateFormula(cobj);
            updateVal(rid,cid,nval,true);
        })
    })

    $('#new').click();
})