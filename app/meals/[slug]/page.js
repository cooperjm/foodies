export default function Share({ params }) {
   console.log(params);
   return (
      <main>
         <h1 style={{ color: "white", textAlign: "center" }}>{params.slug}</h1>
      </main>
   );
}
