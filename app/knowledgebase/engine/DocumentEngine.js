export default class DocumentEngine{

    static get(data,service){

        return data.services.find(

            s=>s.code===service

        )?.documents || [];

    }

}
