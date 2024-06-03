import { ShortLinkProps } from "../../../src/types";

export async function getLocalLinks(){
    try{
    let hash = JSON.parse(localStorage.getItem("hash_dub") || "[]");
    let localLinks: ShortLinkProps[]= [];
    if (hash) {
    localLinks = hash.map((link: any)=>{
    return JSON.parse(window.atob(link));
    })
   }
   return localLinks;
   }
   catch(error){
    console.error(error);
    return [];
   }
}

export async function setLocalLinks({newLink}: {newLink : ShortLinkProps}){
    try{
    const hash = JSON.parse((localStorage.getItem("hash_dub") || "[]"));
    hash.push(window.btoa(JSON.stringify(newLink)));
    localStorage.setItem("hash_dub", JSON.stringify(hash));
    window.Storage.toString
    }
    catch(error){
     console.error(error);
    }
}
