export default class KnowledgeSearch{

    static search(data,query){

        const q=query.toLowerCase();

        return data.services.filter(service=>{

            return (

                service.name.toLowerCase().includes(q)

                ||

                service.category.toLowerCase().includes(q)

            );

        });

    }

}
