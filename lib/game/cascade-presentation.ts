import type {CascadeEvent,Cell} from './math';

export type CascadeToken={key:string;column:number;row:number;fromRow:number;cell:Cell;fresh:boolean};
export type CascadeFrame={event:CascadeEvent;tokens:CascadeToken[]};
export type CascadePlan={frame:CascadeFrame;exiting:CascadeToken[];freshRound:boolean};

// Preserve each surviving symbol's identity while it falls. Its final cell and
// all new symbols still come from the next server board, never a local draw.
export function cascadePlan(previous:CascadeFrame|null,event:CascadeEvent):CascadePlan{
 const sameRound=!!previous&&previous.event.round===event.round&&event.step>1;
 const removed=new Set(previous?.event.removed??[]);
 const tokens:CascadeToken[]=[],exiting:CascadeToken[]=[];
 if(previous)for(const token of previous.tokens)if(!sameRound||removed.has(`${token.column}:${token.row}`))exiting.push(token);
 for(let column=0;column<event.board.length;column++){
  const height=event.board[column].length;
  const survivors=sameRound?previous!.tokens.filter(token=>token.column===column&&!removed.has(`${column}:${token.row}`)).sort((a,b)=>a.row-b.row):[];
  const added=height-survivors.length;
  for(let row=0;row<height;row++){
   const survivor=row>=added?survivors[row-added]:undefined;
   tokens.push({key:survivor?.key??`${event.index}:${column}:${row}`,column,row,fromRow:survivor?.row??row-added,cell:event.board[column][row],fresh:!survivor});
  }
 }
 return {frame:{event,tokens},exiting,freshRound:!sameRound};
}
