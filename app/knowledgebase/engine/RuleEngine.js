export default class RuleEngine{

    static get(data,service){

        return data.services.find(

            s=>s.code===service

        )?.rules || [];

    }

}
