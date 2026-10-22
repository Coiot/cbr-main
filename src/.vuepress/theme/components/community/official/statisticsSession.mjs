import {statisticsAtTurn} from '../../../../../shared/mapStatistics.mjs';
import {mapReleaseRequest} from './mapReleaseApi.mjs';

export const statisticsMethods={
  async load(){
    if(!this._alive)return;
    const request=this._request=(this._request||0)+1,turn=this.turn,id=this.releaseId,history=this.release.history;
    this._abort?.abort();this._abort=new AbortController();this.snapshot=null;this.error='';this.loading=true;
    try{
      let snapshot;
      if(this.preview)snapshot={history,...statisticsAtTurn(this.release,turn)};
      else {
        if(!id)throw new Error('No published statistics release.');
        snapshot=await mapReleaseRequest({action:'statistics',id,turn},this.client,this._abort.signal);
        if(snapshot.id!==id)throw new Error('The statistics release changed. Reload to retry.');
      }
      if(snapshot.turn!==turn||snapshot.history!==history)throw new Error('Statistics do not match this timeline turn.');
      if(this._alive&&request===this._request)this.snapshot=snapshot;
    }catch(error){if(this._alive&&request===this._request&&error.name!=='AbortError')this.error='Statistics could not be loaded. Please retry.';}
    finally{if(this._alive&&request===this._request)this.loading=false;}
  }
};
