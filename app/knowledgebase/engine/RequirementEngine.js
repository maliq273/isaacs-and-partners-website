export default class RequirementEngine{

    static get(data,service){

        return data.services.find(

            s=>s.code===service

        )?.requirements || [];

    }

}
